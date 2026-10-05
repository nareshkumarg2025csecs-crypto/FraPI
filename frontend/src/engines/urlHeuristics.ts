import type { LayerResult, Reason } from './types';
import suspiciousTldsData from '../../../data/lexicon/suspicious_tlds.json' with { type: 'json' };
import trustedBrandsData from '../../../data/lexicon/trusted_brands.json' with { type: 'json' };
import urlShortenersData from '../../../data/lexicon/url_shorteners.json' with { type: 'json' };
import scamWordsData from '../../../data/lexicon/scam_words.json' with { type: 'json' };

const suspiciousTlds = suspiciousTldsData as string[];
const trustedBrands = trustedBrandsData as Record<string, string[]>;
const urlShorteners = new Set(urlShortenersData as string[]);
const scamWords = scamWordsData as string[];

export interface UrlCheckFinding {
  url: string;
  isShortener: boolean;
  isIpHost: boolean;
  isPunycode: boolean;
  hasExcessiveSubdomains: boolean;
  hasSuspiciousTld: boolean;
  hasBrandLookalike: boolean;
  matchedBrand?: string;
  hasAtSymbol: boolean;
  isHttp: boolean;
  hasMultipleHyphens: boolean;
  hasScamWordsWithActionPath: boolean;
  matchedScamWord?: string;
}

export function parseDomain(urlStr: string): { protocol: string; hostname: string; fullUrl: string; pathname: string } | null {
  try {
    let clean = urlStr.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    const u = new URL(clean);
    return {
      protocol: u.protocol,
      hostname: u.hostname.toLowerCase(),
      fullUrl: clean,
      pathname: u.pathname.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function isIpAddress(hostname: string): boolean {
  // IPv4 or IPv6
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Pattern.test(hostname) || hostname.startsWith('[') || hostname.includes(':');
}

export function checkBrandLookalike(hostname: string): { isLookalike: boolean; brand?: string } {
  for (const [brand, officialDomains] of Object.entries(trustedBrands)) {
    // Check if brand token appears in domain
    if (hostname.includes(brand)) {
      const isOfficial = officialDomains.some(
        (domain) => hostname === domain || hostname.endsWith('.' + domain)
      );
      if (!isOfficial) {
        return { isLookalike: true, brand };
      }
    }
  }
  return { isLookalike: false };
}

export function inspectUrl(rawUrl: string): UrlCheckFinding | null {
  const parsed = parseDomain(rawUrl);
  if (!parsed) return null;

  const { hostname, protocol, pathname } = parsed;
  const isShortener = urlShorteners.has(hostname) || Array.from(urlShorteners).some((s) => hostname.endsWith('.' + s));
  const isIpHost = isIpAddress(hostname);
  const isPunycode = hostname.includes('xn--');

  // Excessive subdomains: e.g. a.b.c.example.com (parts > 3 for typical domain, > 4 for .co.in / .gov.in)
  const parts = hostname.split('.');
  const isSecondLevelCctld = hostname.endsWith('.co.in') || hostname.endsWith('.gov.in') || hostname.endsWith('.ac.in');
  const maxNormalParts = isSecondLevelCctld ? 4 : 3;
  const hasExcessiveSubdomains = parts.length > maxNormalParts && !isIpHost;

  const hasSuspiciousTld = suspiciousTlds.some((tld) => hostname.endsWith(tld.toLowerCase()));
  const brandCheck = checkBrandLookalike(hostname);
  const hasAtSymbol = rawUrl.includes('@');
  const isHttp = protocol === 'http:';

  // Hyphens in registrable domain
  // A naive approach for registrable domain: just check the main hostname parts
  const hasMultipleHyphens = !isIpHost && (hostname.match(/-/g) || []).length >= 2;

  // Scam words in domain combined with action path
  const hasActionPath = /\/(pay|verify|claim|login|upi)\b/i.test(pathname);
  const matchedScamWord = hasActionPath ? scamWords.find(w => hostname.includes(w)) : undefined;
  const hasScamWordsWithActionPath = !!matchedScamWord;

  return {
    url: rawUrl,
    isShortener,
    isIpHost,
    isPunycode,
    hasExcessiveSubdomains,
    hasSuspiciousTld,
    hasBrandLookalike: brandCheck.isLookalike,
    matchedBrand: brandCheck.brand,
    hasAtSymbol,
    isHttp,
    hasMultipleHyphens,
    hasScamWordsWithActionPath,
    matchedScamWord,
  };
}

export function evaluateUrlHeuristics(urls: string[] | string): LayerResult {
  const urlList = Array.isArray(urls) ? urls : [urls];
  const validFindings: UrlCheckFinding[] = [];

  for (const u of urlList) {
    if (!u || u.trim().length === 0) continue;
    const f = inspectUrl(u);
    if (f) validFindings.push(f);
  }

  if (validFindings.length === 0) {
    return {
      available: false,
      score: 0,
      reasons: [],
      unknowns: ['No valid URLs extracted for heuristic analysis.'],
    };
  }

  const reasons: Reason[] = [];
  let rawScore = 0;

  for (const f of validFindings) {
    if (f.hasBrandLookalike) {
      rawScore += 0.35;
      reasons.push({
        layer: 'web',
        severity: 'medium',
        title: 'Brand Impersonation Domain Detected',
        detail: `The domain in "${f.url}" includes the brand name "${f.matchedBrand}", but is not an authorized official domain of that organization.`,
        evidence: [`URL: ${f.url}`, `Impersonated Brand: ${f.matchedBrand}`],
      });
    }

    if (f.isIpHost) {
      rawScore += 0.30;
      reasons.push({
        layer: 'web',
        severity: 'medium',
        title: 'IP Address Host Detected',
        detail: `The link "${f.url}" routes directly to an IP address rather than a verified domain name.`,
        evidence: [f.url],
      });
    }

    if (f.isPunycode) {
      rawScore += 0.25;
      reasons.push({
        layer: 'web',
        severity: 'medium',
        title: 'Punycode Internationalized Domain Detected',
        detail: `The domain in "${f.url}" uses punycode characters (xn--), which can be exploited to spoof familiar domain names.`,
        evidence: [f.url],
      });
    }

    if (f.hasAtSymbol) {
      rawScore += 0.25;
      reasons.push({
        layer: 'web',
        severity: 'medium',
        title: 'Misleading "@" Symbol in URL',
        detail: `The link "${f.url}" contains an "@" symbol, which can trick users about the true destination server.`,
        evidence: [f.url],
      });
    }

    if (f.hasSuspiciousTld) {
      rawScore += 0.20;
      reasons.push({
        layer: 'web',
        severity: 'low',
        title: 'High-Risk Top-Level Domain',
        detail: `The link "${f.url}" uses a domain extension commonly associated with bulk disposable spam websites.`,
        evidence: [f.url],
      });
    }

    if (f.hasExcessiveSubdomains) {
      rawScore += 0.15;
      reasons.push({
        layer: 'web',
        severity: 'low',
        title: 'Excessive Subdomain Levels',
        detail: `The domain in "${f.url}" contains an unusually high number of nested subdomains.`,
        evidence: [f.url],
      });
    }

    if (f.isShortener) {
      rawScore += 0.15;
      reasons.push({
        layer: 'web',
        severity: 'low',
        title: 'URL Shortener In Use',
        detail: `The link "${f.url}" is masked behind a URL shortening service, hiding the ultimate payment or login destination.`,
        evidence: [f.url],
      });
    }

    if (f.hasMultipleHyphens) {
      rawScore += 0.20;
      reasons.push({
        layer: 'web',
        severity: 'low',
        title: 'Multiple Hyphens in Domain',
        detail: `The domain in "${f.url}" contains multiple hyphens, a common obfuscation technique for phishing sites.`,
        evidence: [f.url],
      });
    }

    if (f.hasScamWordsWithActionPath) {
      rawScore += 0.40;
      reasons.push({
        layer: 'web',
        severity: 'medium',
        title: 'Suspicious Keywords and Action Path',
        detail: `The domain uses a scam-associated word ("${f.matchedScamWord}") and requests a sensitive action in the path.`,
        evidence: [f.url],
      });
    }

    if (f.isHttp) {
      rawScore += 0.10;
      reasons.push({
        layer: 'web',
        severity: 'low',
        title: 'Unencrypted Connection (HTTP)',
        detail: `The link "${f.url}" does not use HTTPS encryption, exposing data in transit.`,
        evidence: [f.url],
      });
    }
  }

  // Cap score to maximum 0.60 (60/100) per requirements
  const cappedScore = Math.min(rawScore, 0.60);

  if (reasons.length === 0) {
    reasons.push({
      layer: 'web',
      severity: 'info',
      title: 'Standard Domain Structure',
      detail: 'The URL uses standard HTTPS protocol and recognized domain naming conventions.',
      evidence: validFindings.map((f) => f.url),
    });
  }

  return {
    available: true,
    score: Math.round(cappedScore * 100),
    reasons,
    unknowns: [],
  };
}
