import type { LayerResult, Reason } from './types';
import { normalizeUrlCandidate } from './entityExtractor';

export interface GsbResponse {
  status: 'ok' | 'unavailable' | 'rate_limited';
  threatTypes: string[];
}

export interface VtResponse {
  status: 'ok' | 'unavailable' | 'rate_limited';
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  reputation: number;
}

export interface SingleUrlReputationResult {
  url: string;
  domain: string;
  gsb: GsbResponse;
  vt: VtResponse;
  cached: boolean;
}

export interface ReputationApiResponse {
  results: SingleUrlReputationResult[];
}

export interface ReputationPayloadInfo {
  urlsToSend: string[];
  domainsToSend: string[];
}

export interface ReputationResult {
  success: boolean;
  status: 'ok' | 'unavailable' | 'disabled';
  data?: ReputationApiResponse;
  error?: string;
}

export function extractReputationTargets(rawUrls: string[]): ReputationPayloadInfo {
  const validUrls: string[] = [];
  const validDomains = new Set<string>();

  for (const u of rawUrls) {
    if (!u || typeof u !== 'string') continue;
    const norm = normalizeUrlCandidate(u);
    if (norm && !validUrls.includes(norm) && validUrls.length < 5) {
      validUrls.push(norm);
      try {
        const parsed = new URL(norm);
        validDomains.add(parsed.hostname.toLowerCase());
      } catch {
        // ignore
      }
    }
  }

  return {
    urlsToSend: validUrls,
    domainsToSend: Array.from(validDomains),
  };
}

export async function checkReputationOnline(
  urls: string[],
  enabled: boolean,
  fetchFn: typeof fetch = fetch
): Promise<ReputationResult> {
  if (!enabled) {
    return {
      success: false,
      status: 'disabled',
      error: 'Online reputation check is disabled by user setting.',
    };
  }

  const { urlsToSend } = extractReputationTargets(urls);
  if (urlsToSend.length === 0) {
    return {
      success: false,
      status: 'unavailable',
      error: 'No valid URLs to check.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetchFn('/api/reputation/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls: urlsToSend }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        status: 'unavailable',
        error: `Backend returned status ${response.status}`,
      };
    }

    let json: ReputationApiResponse;
    try {
      json = (await response.json()) as ReputationApiResponse;
    } catch {
      return {
        success: false,
        status: 'unavailable',
        error: 'Invalid JSON response from backend server.',
      };
    }

    return {
      success: true,
      status: 'ok',
      data: json,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    let errorMsg = 'Reputation service unavailable';
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        errorMsg = 'Reputation request timed out after 5 seconds';
      } else {
        errorMsg = err.message;
      }
    }
    return {
      success: false,
      status: 'unavailable',
      error: errorMsg,
    };
  }
}

export function mapReputationToLayerResult(
  repResponse?: ReputationApiResponse,
  onlineCheckAttempted: boolean = false
): LayerResult {
  if (!onlineCheckAttempted || !repResponse || repResponse.results.length === 0) {
    return {
      available: false,
      score: 0,
      reasons: [],
      unknowns: ['No reputation data found. This does not mean it is safe.'],
    };
  }

  const weights: number[] = [];
  const reasons: Reason[] = [];

  for (const item of repResponse.results) {
    // 1. Google Safe Browsing
    if (item.gsb.status === 'ok' && item.gsb.threatTypes.length > 0) {
      weights.push(0.9);
      reasons.push({
        layer: 'web',
        severity: 'critical',
        title: 'Flagged by Google Safe Browsing',
        detail: `The link "${item.url}" is flagged as deceptive or malicious (${item.gsb.threatTypes.join(', ')}).`,
        evidence: item.gsb.threatTypes,
      });
    }

    // 2. VirusTotal
    if (item.vt.status === 'ok') {
      if (item.vt.malicious >= 3) {
        weights.push(0.8);
        reasons.push({
          layer: 'web',
          severity: 'high',
          title: 'Flagged Malicious by Multiple Antivirus Vendors',
          detail: `The domain "${item.domain}" was identified as malicious by ${item.vt.malicious} security vendors on VirusTotal.`,
          evidence: [`Malicious detections: ${item.vt.malicious}`, `Suspicious: ${item.vt.suspicious}`],
        });
      } else if (item.vt.malicious >= 1) {
        weights.push(0.5);
        reasons.push({
          layer: 'web',
          severity: 'medium',
          title: 'Flagged Suspicious by Antivirus Vendors',
          detail: `The domain "${item.domain}" was flagged by ${item.vt.malicious} vendor(s) on VirusTotal.`,
          evidence: [`Malicious: ${item.vt.malicious}`],
        });
      } else if (item.vt.suspicious > 0) {
        weights.push(0.3);
        reasons.push({
          layer: 'web',
          severity: 'low',
          title: 'Potential Suspicious Vendor Detection',
          detail: `The domain "${item.domain}" received suspicious alerts from ${item.vt.suspicious} vendor(s).`,
          evidence: [`Suspicious: ${item.vt.suspicious}`],
        });
      }
    }
  }

  if (weights.length === 0) {
    return {
      available: true,
      score: 0,
      reasons: [],
      unknowns: ['No reputation data found. This does not mean it is safe.'],
    };
  }

  // Combine weights with noisy-OR: 1 - product(1 - w_i)
  const complementProduct = weights.reduce((acc, w) => acc * (1 - w), 1);
  const rawScore = 1 - complementProduct;
  // Cap at 0.90 per requirements
  const finalScore = Math.min(rawScore, 0.9);

  return {
    available: true,
    score: Math.round(finalScore * 100),
    reasons,
    unknowns: ['No reputation data found. This does not mean it is safe.'],
  };
}
