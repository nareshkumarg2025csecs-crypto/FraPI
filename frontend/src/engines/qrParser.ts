import jsQR from 'jsqr';
import type { ParsedQr } from './types';
import upiHandles from '../../../data/lexicon/upi_handles.json' with { type: "json" };
import { perf } from '../perf';

export interface DecodeOptions {
  tryUpscaling?: boolean;
}

const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/;

// Known handles fetched from data/lexicon/upi_handles.json
// Note: This must be verified against NPCI's published list for production
const knownHandles = new Set(upiHandles as string[]);

export async function decodeQrFromImage(imageSource: HTMLImageElement | HTMLCanvasElement, options: DecodeOptions = {}): Promise<string | null> {
  perf.mark('qr_decode_start');

  let width = imageSource.width;
  let height = imageSource.height;
  
  // Downscale to at most 1000px
  const maxSide = Math.max(width, height);
  if (maxSide > 1000) {
    const ratio = 1000 / maxSide;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageSource, 0, 0, width, height);

  // 1. Try native BarcodeDetector if available
  if ('BarcodeDetector' in window) {
    try {
      perf.mark('qr_barcode_detector_start');
      // @ts-ignore
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(canvas);
      perf.measure('qr_barcode_detector', 'qr_barcode_detector_start');
      if (barcodes.length > 0) {
        perf.measure('qr_decode_total', 'qr_decode_start');
        return barcodes[0].rawValue;
      }
    } catch (e) {
      console.warn('BarcodeDetector failed', e);
    }
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  
  // 2. Try jsQR on downscaled image
  perf.mark('qr_jsqr_start');
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  perf.measure('qr_jsqr', 'qr_jsqr_start');
  if (code) {
    perf.measure('qr_decode_total', 'qr_decode_start');
    return code.data;
  }

  // 3. Try upscaled variants ONLY if first two fail
  if (options.tryUpscaling) {
    perf.mark('qr_jsqr_upscale_start');
    const upscaledCanvas = document.createElement('canvas');
    upscaledCanvas.width = canvas.width * 2;
    upscaledCanvas.height = canvas.height * 2;
    const upscaledCtx = upscaledCanvas.getContext('2d')!;
    upscaledCtx.imageSmoothingEnabled = false;
    upscaledCtx.drawImage(canvas, 0, 0, upscaledCanvas.width, upscaledCanvas.height);
    
    const upImageData = upscaledCtx.getImageData(0, 0, upscaledCanvas.width, upscaledCanvas.height);
    const upCode = jsQR(upImageData.data, upImageData.width, upImageData.height);
    perf.measure('qr_jsqr_upscale', 'qr_jsqr_upscale_start');
    if (upCode) {
      perf.measure('qr_decode_total', 'qr_decode_start');
      return upCode.data;
    }
  }

  perf.measure('qr_decode_total', 'qr_decode_start');
  return null;
}

export function parseQrData(rawData: string | null): ParsedQr {
  const warnings: string[] = [];
  
  if (!rawData) {
    warnings.push('QR code is empty or could not be read.');
    return { raw: '', kind: 'unknown', isCollectRequest: false, isUpiUrl: false, params: {}, warnings };
  }

  const trimmed = rawData.trim();
  const lower = trimmed.toLowerCase();

  // If normal web link
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return { raw: trimmed, kind: 'url', isCollectRequest: false, isUpiUrl: false, params: {}, warnings };
  }

  const isUpiUrl = lower.startsWith('upi://');
  if (!isUpiUrl) {
    warnings.push('Payload is not a valid UPI or HTTP URL.');
    return { raw: trimmed, kind: 'unknown', isCollectRequest: false, isUpiUrl: false, params: {}, warnings };
  }

  // Parse upi://pay?...
  const params: Record<string, string> = {};
  const queryIndex = trimmed.indexOf('?');
  
  if (queryIndex !== -1) {
    const queryString = trimmed.substring(queryIndex + 1);
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        params[key.toLowerCase()] = decodeURIComponent(value.replace(/\+/g, ' '));
      }
    }
  } else {
    warnings.push('Malformed UPI payload: No query parameters found.');
  }

  const vpa = params['pa'];
  const name = params['pn'];
  let amount: number | undefined;

  if (params['am']) {
    const parsedAmt = parseFloat(params['am']);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      amount = parsedAmt;
    } else {
      warnings.push('Invalid amount format in QR.');
    }
  }

  if (vpa) {
    if (!vpaRegex.test(vpa)) {
      warnings.push('Invalid VPA handle format.');
    } else {
      const suffix = vpa.split('@')[1]?.toLowerCase();
      if (suffix && !knownHandles.has(suffix)) {
        warnings.push(`VPA handle suffix @${suffix} is not in the known handles lexicon.`);
      }
    }
  } else {
    warnings.push('Missing payee VPA (pa) in UPI payload.');
  }

  // A valid upi://pay QR always means direction 'outgoing' (the scanner pays).
  // Document this as a hard fact: 
  // SCANNING A UPI QR CODE ALWAYS INITIATES A PAYMENT OUT OF THE SCANNER'S ACCOUNT.

  const isCollectRequest = params['mode'] === '02' || params['mode'] === '04' || lower.includes('upi://collect');

  return {
    raw: trimmed,
    kind: 'upi',
    vpa,
    name,
    amount,
    isCollectRequest,
    isUpiUrl: true,
    params,
    warnings,
  };
}

export async function startLiveDecodeLoop(videoElement: HTMLVideoElement, onDecode: (data: string) => void) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    videoElement.srcObject = stream;
    videoElement.setAttribute('playsinline', 'true'); // required to tell iOS safari we don't want fullscreen
    videoElement.play();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const tick = async () => {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvas.height = videoElement.videoHeight;
        canvas.width = videoElement.videoWidth;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const data = await decodeQrFromImage(canvas);
        if (data) {
          onDecode(data);
          return; // Stop on first successful decode
        }
      }
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
  } catch (err) {
    console.error("Error accessing camera", err);
  }
}
