export const RISK_CONFIG = {
  thresholds: { review: 0.45, high: 0.65 },
  layerStrength: { rule: 1.0, intent: 0.9, reference: 0.8, web: 0.7, language: 0.5 },
  webCap: 0.9,
  floors: { hardRuleCritical: 0.9, intentCritical: 0.8, intentHigh: 0.65, referenceHigh: 0.6 },
  languageOnlyCap: 0.64,
  languageOnlyReviewScore: 85,
  webWeights: {
    safeBrowsingFlagged: 0.9,
    vtMalicious3Plus: 0.8,
    vtMalicious1to2: 0.5,
    vtSuspiciousOnly: 0.3,
    domainAgeUnder7: 0.6,
    domainAgeUnder30: 0.4
  }
};

