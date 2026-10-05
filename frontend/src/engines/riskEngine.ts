import type { LayerResult, Reason, Severity, RiskLevel } from './types';
import { RISK_CONFIG } from './riskConfig';

export type Confidence = 'limited' | 'moderate' | 'good';

export interface I4CLink {
  url: string;
  searchTerms: string[];
}

export interface PrivacyReport {
  sentOnline: string[];
  localOnly: boolean;
}

export interface LayerBreakdown {
  rule: LayerResult;
  intent: LayerResult;
  reference: LayerResult;
  language: LayerResult;
  web: LayerResult;
}

export interface Verdict {
  riskLevel: RiskLevel;
  score: number; // 0.0 to 1.0
  scorePercentage: number; // 0 to 100
  label: string;
  confidence: Confidence;
  reasons: Reason[];
  unknowns: string[];
  i4c?: I4CLink;
  privacy: PrivacyReport;
  layerBreakdown: LayerBreakdown;
}

export interface RiskEvaluationOptions {
  ocrConfidence?: number;
  searchTerms?: string[];
  sentOnline?: string[];
  hasMessageDirection?: boolean;
  hasQr?: boolean;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const LAYER_ORDER: Record<string, number> = {
  rule: 1,
  intent: 2,
  reference: 3,
  web: 4,
  language: 5,
};

export function evaluateRisk(
  layers: LayerBreakdown,
  options: RiskEvaluationOptions = {}
): Verdict {
  const { rule, intent, reference, language, web } = layers;

  // 1. Calculate noisy-OR score
  const strengthMap: Record<'rule' | 'intent' | 'reference' | 'language' | 'web', number> = {
    rule: RISK_CONFIG.layerStrength.rule,
    intent: RISK_CONFIG.layerStrength.intent,
    reference: RISK_CONFIG.layerStrength.reference,
    language: RISK_CONFIG.layerStrength.language,
    web: RISK_CONFIG.layerStrength.web,
  };

  const scoringLayers: Array<{ key: 'rule' | 'intent' | 'reference' | 'language' | 'web'; layer: LayerResult }> = [
    { key: 'rule', layer: rule },
    { key: 'intent', layer: intent },
    { key: 'reference', layer: reference },
    { key: 'language', layer: language },
    { key: 'web', layer: web },
  ];

  let product = 1;
  let hasValidLayers = false;

  const availableItems = scoringLayers.filter(
    (item) => item.layer.available && item.layer.state !== 'failed' && item.layer.state !== 'not_applicable'
  );
  const sumWeights = availableItems.reduce((acc, item) => acc + strengthMap[item.key], 0);

  for (const item of availableItems) {

    const s = Math.max(0, Math.min(100, item.layer.score)) / 100;
    const weight = sumWeights > 0 ? strengthMap[item.key] / sumWeights : strengthMap[item.key];
    const c = s * weight;
    product *= (1 - c);
    hasValidLayers = true;
  }

  let finalScore = hasValidLayers ? 1 - product : 0;


  // 2. Applicable floors
  const hasCriticalRule = rule.reasons.some((r) => r.severity === 'critical');
  const hasCriticalIntent = intent.reasons.some((r) => r.severity === 'critical');
  const hasHighIntent = intent.reasons.some((r) => r.severity === 'high');
  const hasHighRefLookalike = reference.reasons.some(
    (r) =>
      r.severity === 'high' &&
      (r.title.includes('Look-Alike') ||
        r.title.includes('Handle Swap') ||
        r.title.includes('Similar'))
  );

  let floor = 0;
  if (hasCriticalRule) {
    floor = Math.max(floor, RISK_CONFIG.floors.hardRuleCritical); // 0.90
  }
  if (hasCriticalIntent) {
    floor = Math.max(floor, RISK_CONFIG.floors.intentCritical); // 0.80
  }
  if (hasHighIntent && RISK_CONFIG.floors.intentHigh) {
    floor = Math.max(floor, RISK_CONFIG.floors.intentHigh); // 0.65
  }
  if (hasHighRefLookalike) {
    floor = Math.max(floor, RISK_CONFIG.floors.referenceHigh); // 0.60
  }

  finalScore = Math.max(finalScore, floor);

  // 3. Language layer only cap: If language layer is only source of signal and no critical rule fired -> cap at 0.64
  const otherSignalsFired =
    hasCriticalRule ||
    (intent.available && intent.score > 15) ||
    (reference.available && reference.score > 15) ||
    (web.available && web.score > 15) ||
    (rule.available && rule.score > 15);

  if (language.available && language.score > 25 && !otherSignalsFired) {
    if (finalScore > RISK_CONFIG.languageOnlyCap) {
      finalScore = RISK_CONFIG.languageOnlyCap; // Max 0.64 -> REVIEW at most
    }
  }

  // Reason gathering and mutation
  let allReasons: Reason[] = [];
  const allUnknowns = new Set<string>();
  const allLayers = [rule, intent, reference, language, web];

  for (const l of allLayers) {
    // We make a copy of reasons so we can mutate severity if needed
    allReasons.push(...l.reasons.map(r => ({...r})));
    for (const u of l.unknowns) {
      allUnknowns.add(u);
    }
  }

  // Check required minimum risk based on reasons
  const hasHighOrCritical = allReasons.some(r => r.severity === 'critical' || r.severity === 'high');
  const mediumReasons = allReasons.filter(r => r.severity === 'medium');
  const mediumLayers = new Set(mediumReasons.map(r => r.layer));
  
  let minimumReview = false;
  if (hasHighOrCritical) {
    minimumReview = true;
  }
  if (mediumLayers.size >= 2) {
    minimumReview = true;
  }
  
  // language-only medium reasons -> REVIEW only if the language score >= languageOnlyReviewScore
  const langReviewThreshold = RISK_CONFIG.languageOnlyReviewScore ?? 85;
  if (mediumLayers.size === 1 && mediumLayers.has('language') && language.score >= langReviewThreshold && !hasHighOrCritical) {
    minimumReview = true;
  }

  if (minimumReview && finalScore < RISK_CONFIG.thresholds.review) {
    finalScore = RISK_CONFIG.thresholds.review; // Elevate to REVIEW
  }

  // Force LOW_RISK if language is the only signal and it's below review threshold
  if (mediumLayers.size === 1 && mediumLayers.has('language') && language.score < langReviewThreshold && !hasHighOrCritical) {
    finalScore = Math.min(finalScore, 0.29);
  }



  // 4. Map to LOW_RISK / REVIEW / HIGH_RISK
  let riskLevel: RiskLevel;
  let label: string;

  if (finalScore >= RISK_CONFIG.thresholds.high) {
    riskLevel = 'HIGH_RISK';
    label = 'High risk: potential scam detected';
  } else if (finalScore >= RISK_CONFIG.thresholds.review) {
    riskLevel = 'REVIEW';
    label = 'Review needed: suspicious patterns detected';
  } else {
    riskLevel = 'LOW_RISK';
    label = 'Low risk: no red flags found'; // Required phrasing: never "safe"
    
    // Never show a medium+ finding under LOW_RISK. Downgrade them to info.
    for (const r of allReasons) {
      if (r.severity === 'critical' || r.severity === 'high' || r.severity === 'medium') {
        r.severity = 'info';
      }
    }
  }

  // 5. Confidence calculation
  // 'good' only if (message direction known OR QR decoded) AND at most 2 unknown comparisons AND OCR confidence >= 70 when OCR was used. Many unknowns -> 'limited'.
  // Keep the existing layer-state rule (ran / not_applicable / failed) that downgrades confidence only for failed layers.
  const ranCount = allLayers.filter((l) => l.state === 'ran').length;
  const availableCount = allLayers.filter((l) => l.available && l.state !== 'not_applicable' && l.state !== 'failed').length;
  const anyFailed = allLayers.some((l) => l.state === 'failed');
  const activeCount = Math.max(ranCount, availableCount);

  let confidence: Confidence = 'moderate';
  if (activeCount >= 4) {
    confidence = 'good';
  } else if (activeCount >= 2) {
    confidence = 'moderate';
  } else {
    confidence = 'limited';
  }

  const ocrUsed = options.ocrConfidence !== undefined;
  const ocrGood = ocrUsed ? options.ocrConfidence! >= 70 : true;
  if ((ocrUsed && !ocrGood) || allUnknowns.size > 4) {
    confidence = 'limited';
  }

  if (anyFailed) {
    if (confidence === 'good') confidence = 'moderate';
    else if (confidence === 'moderate') confidence = 'limited';
  }


  // 6. Reasons sorting: by severity desc, then by layer order
  allReasons.sort((a, b) => {
    const sevA = SEVERITY_WEIGHT[a.severity] || 0;
    const sevB = SEVERITY_WEIGHT[b.severity] || 0;
    if (sevB !== sevA) return sevB - sevA;
    const layerA = LAYER_ORDER[a.layer] || 99;
    const layerB = LAYER_ORDER[b.layer] || 99;
    return layerA - layerB;
  });

  // 7. I4C Link for REVIEW and HIGH_RISK
  let i4c: I4CLink | undefined;
  if (riskLevel === 'REVIEW' || riskLevel === 'HIGH_RISK') {
    const searchTerms = Array.from(new Set(options.searchTerms || [])).filter(Boolean);
    i4c = {
      url: 'https://cybercrime.gov.in/Webform/suspect_search_repository.aspx',
      searchTerms,
    };
  }

  // 8. Privacy report
  const sentOnline = options.sentOnline || [];
  const privacy: PrivacyReport = {
    sentOnline,
    localOnly: sentOnline.length === 0,
  };

  return {
    riskLevel,
    score: Math.round(finalScore * 100) / 100,
    scorePercentage: Math.round(finalScore * 100),
    label,
    confidence,
    reasons: allReasons,
    unknowns: Array.from(allUnknowns),
    i4c,
    privacy,
    layerBreakdown: layers,
  };
}
