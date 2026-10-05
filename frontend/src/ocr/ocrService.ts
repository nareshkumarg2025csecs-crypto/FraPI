import { createWorker, PSM, type Worker } from 'tesseract.js';
import { perf } from '../perf';

export interface OcrResult {
  text: string;
  confidence: number;
  words: Array<{ text: string; confidence: number }>;
}

export type ProgressCallback = (m: { status: string; progress: number }) => void;

let sharedWorker: Worker | null = null;
let workerInitPromise: Promise<Worker> | null = null;
let workerIdleTimeout: any = null;

// Lazily initialize and pre-warm a single shared worker
export async function getOcrWorker(onProgress?: ProgressCallback): Promise<Worker> {
  if (workerInitPromise) {
    return workerInitPromise;
  }
  perf.mark('ocr_worker_init_start');

  workerInitPromise = (async () => {
    const opts: any = {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core.wasm.js',
      langPath: '/tesseract',
      gzip: true,
      lstmOnly: true,
      workerBlobURL: false,
      cacheMethod: 'none',
      logger: (m: { status: string; progress: number }) => {
        if (onProgress) {
          onProgress({ status: m.status, progress: m.progress });
        }
      },
    };
    const worker = await createWorker('eng', 1, opts);
    await worker.setParameters({
      user_defined_dpi: '300' // Suppress "Estimating resolution" warning
    });
    perf.measure('ocr_worker_init', 'ocr_worker_init_start');
    return worker;
  })();

  sharedWorker = await workerInitPromise;
  return sharedWorker;
}

export function terminateOcrWorker() {
  if (sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
    workerInitPromise = null;
  }
}

function preprocessImage(img: HTMLImageElement | HTMLCanvasElement, applyThreshold: boolean = false): HTMLCanvasElement | OffscreenCanvas {
  let width = img.width;
  let height = img.height;
  
  // Downscale so longest side is at most ~1600px
  const maxSide = Math.max(width, height);
  if (maxSide > 1600) {
    const ratio = 1600 / maxSide;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  } else {
    // Upscale only if shorter side is under ~600px
    const minSide = Math.min(width, height);
    if (minSide < 600) {
      const ratio = 600 / minSide;
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
  }
  
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  let canvasOrOffscreen: HTMLCanvasElement | OffscreenCanvas;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvasOrOffscreen = new OffscreenCanvas(width, height);
    ctx = canvasOrOffscreen.getContext('2d') as OffscreenCanvasRenderingContext2D;
  } else {
    canvasOrOffscreen = document.createElement('canvas');
    canvasOrOffscreen.width = width;
    canvasOrOffscreen.height = height;
    ctx = canvasOrOffscreen.getContext('2d') as CanvasRenderingContext2D;
  }

  ctx.drawImage(img, 0, 0, width, height);
  
  if (applyThreshold) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    // Grayscale and simple threshold (contrast)
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const threshold = avg > 128 ? 255 : 0;
      data[i] = threshold;
      data[i + 1] = threshold;
      data[i + 2] = threshold;
    }
    ctx.putImageData(imageData, 0, 0);
  }
  
  return canvasOrOffscreen;
}

// Cache to prevent duplicate OCR runs
const ocrCache = new Map<string, OcrResult>();

async function hashImage(imageSource: HTMLImageElement | HTMLCanvasElement | File | Blob): Promise<string> {
  let buffer: ArrayBuffer;
  if (imageSource instanceof File || imageSource instanceof Blob) {
    buffer = await imageSource.arrayBuffer();
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = imageSource.width;
    canvas.height = imageSource.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageSource, 0, 0);
    // Rough approximation, a proper hash of the canvas data:
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    buffer = data.buffer.slice(data.byteOffset, data.byteLength + data.byteOffset);
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function performOcr(
  imageSource: HTMLImageElement | HTMLCanvasElement | File | Blob,
  onProgress?: ProgressCallback
): Promise<OcrResult> {
  perf.mark('ocr_total_start');

  const cacheKey = await hashImage(imageSource);
  if (ocrCache.has(cacheKey)) {
    perf.measure('ocr_total', 'ocr_total_start');
    return ocrCache.get(cacheKey)!;
  }

  if (workerIdleTimeout) {
    clearTimeout(workerIdleTimeout);
  }

  perf.mark('image_decode_start');
  let imageElement: HTMLImageElement | HTMLCanvasElement;
  if (imageSource instanceof File || imageSource instanceof Blob) {
    imageElement = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(imageSource);
    });
  } else {
    imageElement = imageSource;
  }
  perf.measure('image_decode', 'image_decode_start');

  perf.mark('preprocess_start');
  // First pass: without thresholding
  let processedCanvas = preprocessImage(imageElement, false);
  perf.measure('preprocess', 'preprocess_start');

  const worker = await getOcrWorker(onProgress);
  
  // Single pass PSM 6
  perf.mark('ocr_pass_1_start');
  await worker.setParameters({ tessedit_pageseg_mode: (PSM as any).SINGLE_BLOCK || (PSM as any).ASSUME_UNIFORM_BLOCK || '6' }); // PSM 6
  let result = await worker.recognize(processedCanvas as any);
  perf.measure('ocr_pass_1', 'ocr_pass_1_start');

  let data = result.data as any;
  let text = data.text || '';
  let confidence = typeof data.confidence === 'number' ? data.confidence : 0;
  
  // If confidence is low, try again with thresholding and PSM 11 (SPARSE_TEXT)
  if (confidence < 60) {
    perf.mark('preprocess_2_start');
    processedCanvas = preprocessImage(imageElement, true);
    perf.measure('preprocess_2', 'preprocess_2_start');

    perf.mark('ocr_pass_2_start');
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT }); // PSM 11
    const result2 = await worker.recognize(processedCanvas as any);
    perf.measure('ocr_pass_2', 'ocr_pass_2_start');
    
    const data2 = result2.data as any;
    const confidence2 = typeof data2.confidence === 'number' ? data2.confidence : 0;
    
    if (confidence2 > confidence) {
      data = data2;
      text = data.text || '';
      confidence = confidence2;
    }
  }

  // Idle terminate after 30 seconds
  workerIdleTimeout = setTimeout(() => {
    terminateOcrWorker();
  }, 30000);

  const wordsList = Array.isArray(data.words) ? data.words : [];
  
  const resultObj = {
    text,
    confidence,
    words: wordsList.map((w: any) => ({ text: String(w.text || ''), confidence: Number(w.confidence || 0) }))
  };
  
  ocrCache.set(cacheKey, resultObj);
  perf.measure('ocr_total', 'ocr_total_start');
  return resultObj;
}
