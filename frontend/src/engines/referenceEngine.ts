import type { LayerResult, Reason } from './types';
import { type VerifiedReference, normalizeVpa, listReferences } from '../storage/references';

export const LIMITATION_NOTICE =
  'A matching hash proves the entry has not changed since the user saved it, not that the merchant is genuine.';

export function toSkeleton(input: string): string {
  return input
    .toLowerCase()
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/0/g, 'o')
    .replace(/[1l]/g, 'i');
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function calculateNameSimilarity(nameA: string, nameB: string): number {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

  const tokensA = clean(nameA);
  const tokensB = clean(nameB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let matchCount = 0;
  for (const t of setA) {
    if (setB.has(t)) matchCount++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return matchCount / union;
}

export interface ReferenceInput {
  vpa?: string;
  payeeName?: string;
}

export async function evaluateReferenceLayer(
  scanned: ReferenceInput,
  providedReferences?: VerifiedReference[]
): Promise<LayerResult> {
  const references = providedReferences ?? (await listReferences());

  if (!references || references.length === 0) {
    return {
      available: false,
      score: 0,
      reasons: [],
      unknowns: ['No saved references found in local storage.'],
      state: 'not_applicable',
    };
  }

  const reasons: Reason[] = [];
  const unknowns: string[] = [];

  // 1. Check for tampered records in the storage
  const tamperedList = references.filter((r) => r.isTampered);
  if (tamperedList.length > 0) {
    reasons.push({
      layer: 'reference',
      severity: 'high',
      title: 'Tampered Saved Reference Warning',
      detail: `One or more saved references (${tamperedList.map((t) => t.label).join(', ')}) failed integrity verification. This saved reference was modified outside FraPI Sentinel. ${LIMITATION_NOTICE}`,
      evidence: tamperedList.map((t) => `${t.label} (${t.vpa}): hash mismatch`),
    });
  }

  if (!scanned.vpa) {
    return {
      available: true,
      score: tamperedList.length > 0 ? 50 : 0,
      reasons,
      unknowns: ['Scanned QR does not contain a VPA address to compare against references.'],
      state: 'not_applicable',
    };
  }

  const scannedNormalized = normalizeVpa(scanned.vpa);
  const [scannedLocal = '', scannedHandle = ''] = scannedNormalized.split('@');
  const scannedSkeleton = toSkeleton(scannedLocal);
  const scannedName = (scanned.payeeName || '').trim();

  // 2. Exact match check
  const exactMatch = references.find((r) => r.normalizedVpa === scannedNormalized);
  if (exactMatch) {
    if (exactMatch.isTampered) {
      reasons.push({
        layer: 'reference',
        severity: 'critical',
        title: 'Tampered Reference Matched',
        detail: `The QR matches "${exactMatch.label}", but this saved reference was modified! Integrity hash check failed. ${LIMITATION_NOTICE}`,
        evidence: [exactMatch.vpa, exactMatch.payeeName],
      });
      return {
        available: true,
        score: 90,
        reasons,
        unknowns,
      };
    }

    reasons.push({
      layer: 'reference',
      severity: 'info',
      title: 'Verified Saved Reference',
      detail: `Matches your saved trusted merchant "${exactMatch.label}" (${exactMatch.vpa}). ${LIMITATION_NOTICE}`,
      evidence: [exactMatch.vpa, exactMatch.payeeName],
    });

    return {
      available: true,
      score: 0,
      reasons,
      unknowns,
    };
  }

  // 3. Look-alike & Spoofing checks
  let maxScore = tamperedList.length > 0 ? 0.5 : 0;

  for (const ref of references) {
    const [refLocal = '', refHandle = ''] = ref.normalizedVpa.split('@');
    const refSkeleton = toSkeleton(refLocal);

    // 3a. Confusable skeleton match (0<->o, 1<->l<->i, rn<->m, vv<->w)
    if (scannedSkeleton === refSkeleton && scannedLocal !== refLocal) {
      maxScore = Math.max(maxScore, 0.8);
      reasons.push({
        layer: 'reference',
        severity: 'high',
        title: 'Confusable Look-Alike VPA Detected',
        detail: `The address "${scanned.vpa}" uses look-alike characters (homoglyphs) resembling your saved merchant "${ref.label}" (${ref.vpa}). ${LIMITATION_NOTICE}`,
        evidence: [`Scanned: ${scanned.vpa}`, `Saved: ${ref.vpa}`, `Skeleton match: ${scannedSkeleton}`],
      });
      continue;
    }

    // 3b. Same local part, different handle
    if (scannedLocal === refLocal && scannedHandle !== refHandle) {
      maxScore = Math.max(maxScore, 0.75);
      reasons.push({
        layer: 'reference',
        severity: 'high',
        title: 'UPI Handle Swap Detected',
        detail: `The username "${scannedLocal}" matches saved merchant "${ref.label}", but the banking handle is "@${scannedHandle}" instead of "@${refHandle}". ${LIMITATION_NOTICE}`,
        evidence: [`Scanned: ${scanned.vpa}`, `Saved: ${ref.vpa}`],
      });
      continue;
    }

    // 3c. Small edit distance on the local part
    const editDist = levenshteinDistance(scannedLocal, refLocal);
    const maxAllowedDist = refLocal.length > 4 ? 2 : 1;
    if (editDist > 0 && editDist <= maxAllowedDist) {
      maxScore = Math.max(maxScore, 0.65);
      reasons.push({
        layer: 'reference',
        severity: 'high',
        title: 'Similar VPA Local Part Detected',
        detail: `The local address "${scannedLocal}" differs by only ${editDist} character(s) from saved merchant "${ref.label}" (${refLocal}). ${LIMITATION_NOTICE}`,
        evidence: [`Scanned: ${scanned.vpa}`, `Saved: ${ref.vpa}`, `Edit distance: ${editDist}`],
      });
      continue;
    }

    // 3d. Payee name similarity when VPA differs
    if (scannedName.length > 2) {
      const nameSimLabel = calculateNameSimilarity(scannedName, ref.label);
      const nameSimPayee = calculateNameSimilarity(scannedName, ref.payeeName);
      const hasTokenMatch =
        ref.label.length >= 4 &&
        scannedName.toLowerCase().includes(ref.label.toLowerCase());

      if (nameSimLabel >= 0.5 || nameSimPayee >= 0.5 || hasTokenMatch) {
        maxScore = Math.max(maxScore, 0.75);
        reasons.push({
          layer: 'reference',
          severity: 'high',
          title: 'Payee Name Similar to Saved Reference',
          detail: `The scanned payee name "${scannedName}" matches saved merchant "${ref.label}", but the UPI ID "${scanned.vpa}" is different (${ref.vpa}). ${LIMITATION_NOTICE}`,
          evidence: [`Scanned Name: ${scannedName}`, `Scanned VPA: ${scanned.vpa}`, `Saved: ${ref.label} (${ref.vpa})`],
        });
      }
    }
  }

  // 4. No similar reference -> neutral
  if (reasons.length === 0 || (reasons.length === 1 && tamperedList.length > 0 && maxScore <= 0.5)) {
    reasons.push({
      layer: 'reference',
      severity: 'info',
      title: 'Unsaved Merchant (Neutral)',
      detail: `This merchant is not in your saved trusted references. The merchant may simply be new. ${LIMITATION_NOTICE}`,
      evidence: [`Scanned: ${scanned.vpa}`],
    });
  }

  return {
    available: true,
    score: Math.round(maxScore * 100),
    reasons,
    unknowns,
  };
}
