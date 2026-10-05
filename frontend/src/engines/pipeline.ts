import type { LayerResult, Reason, UserIntentInput } from './types';
import { parseQrData } from './qrParser';
import { parseMessage } from './messageParser';
import { extractPaymentStory } from './storyExtractor';
import { evaluateRuleLayer } from './ruleEngine';
import { evaluateIntentLayer } from './intentEngine';
import { evaluateReferenceLayer } from './referenceEngine';
import { evaluateLanguageLayer } from './languageEngine';
import { evaluateUrlHeuristics } from './urlHeuristics';
import { type ReputationApiResponse, mapReputationToLayerResult } from './reputationClient';
import { evaluateRisk, type Verdict } from './riskEngine';
import type { VerifiedReference } from '../storage/references';
import { type ReportItem, normalizeEntityValue, type EntityType } from '../storage/reports';
import { RISK_CONFIG } from './riskConfig';

import { extractEntities } from './entityExtractor';

export interface PipelineInput {
  text?: string;
  qrPayload?: string;
  userIntent?: UserIntentInput;
  references?: VerifiedReference[];
  reports?: ReportItem[];
  reputation?: ReputationApiResponse;
  onlineCheckAttempted?: boolean;
  ocrConfidence?: number;
  onProgress?: (msg: string) => void;
}

const yieldToMain = () => new Promise((r) => setTimeout(r, 0));

// Test-only hook: window.__FRAPI_FORCE_FAIL can be set to a layer key
// ('rule'|'intent'|'reference'|'language'|'web') to make that layer throw.
// Only active when import.meta.env.MODE !== 'production'.
const LAYER_KEY_TO_NAME: Record<string, string> = {
  rule: 'Rule Layer',
  intent: 'Intent Layer',
  reference: 'Reference Layer',
  language: 'Language Layer',
  web: 'Web Layer',
};

export async function safeLayer(
  name: string,
  fn: () => LayerResult | Promise<LayerResult>
): Promise<LayerResult> {
  try {
    // Allow test hook to force a layer to fail (non-production only)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE !== 'production') {
      const forceFailKey: string | undefined =
        typeof window !== 'undefined'
          ? (window as unknown as Record<string, unknown>).__FRAPI_FORCE_FAIL as string | undefined
          : undefined;
      if (forceFailKey) {
        const forceFailName = LAYER_KEY_TO_NAME[forceFailKey] ?? forceFailKey;
        if (name === forceFailName || name === forceFailKey) {
          throw new Error(`[TEST] Force-failed layer: ${name}`);
        }
      }
    }
    const result = await fn();
    return { ...result, state: result.state ?? 'ran' };
  } catch (err) {
    console.error(`Layer exception in ${name}:`, err);
    return {
      available: false,
      score: 0,
      reasons: [],
      unknowns: [`${name} could not run`],
      state: 'failed',
    };
  }
}


export async function analyze(input: PipelineInput): Promise<Verdict> {
  const {
    text,
    qrPayload,
    userIntent,
    references = [],
    reports = [],
    reputation,
    onlineCheckAttempted = false,
    ocrConfidence,
    onProgress,
  } = input;

  // 1. Parsing
  if (onProgress) onProgress('Parsing input...');
  await yieldToMain();
  const parsedQr = qrPayload && qrPayload.trim().length > 0 ? parseQrData(qrPayload) : undefined;
  const messageStory = text && text.trim().length > 0 ? parseMessage(text) : undefined;
  const entities = text && text.trim().length > 0 ? extractEntities(text) : undefined;
  const userStory = userIntent ? extractPaymentStory('user', userIntent) : undefined;
  const qrStory = parsedQr ? extractPaymentStory('qr', parsedQr) : undefined;

  // 2. Layer 2: Rule Engine
  if (onProgress) onProgress('Checking rules...');
  await yieldToMain();
  const ruleResult = await safeLayer('Rule Layer', () => evaluateRuleLayer(parsedQr, text));

  // 3. Layer 3: Intent Engine
  if (onProgress) onProgress('Checking intent...');
  await yieldToMain();
  const intentResult = await safeLayer('Intent Layer', () =>
    evaluateIntentLayer(userStory, messageStory, qrStory, text, parsedQr)
  );

  // 4. Layer 4: Reference Engine
  if (onProgress) onProgress('Checking references...');
  await yieldToMain();
  const referenceResult = await safeLayer('Reference Layer', () =>
    evaluateReferenceLayer(
      { vpa: parsedQr?.vpa, payeeName: parsedQr?.name },
      references || []
    )
  );

  // 5. Layer 5: Language Engine
  if (onProgress) onProgress('Analyzing language...');
  await yieldToMain();
  const languageResult = await safeLayer('Language Layer', () => evaluateLanguageLayer(text));

  // 6. Layer 6 & 7: Web Layer
  if (onProgress) onProgress('Scoring web reputation...');
  await yieldToMain();

  const webResult = await safeLayer('Web Layer', () => {
    const allUrls: string[] = [];
    if (entities?.urls) {
      allUrls.push(...entities.urls);
    }
    if (parsedQr?.params?.url) {
      allUrls.push(parsedQr.params.url);
    }
    const uniqueUrls = Array.from(new Set(allUrls));

    const urlHeuristicResult = evaluateUrlHeuristics(uniqueUrls);
    const onlineRepResult = mapReputationToLayerResult(reputation, onlineCheckAttempted);

    // Check local blocklist reports against found entities
    const blocklistReasons: Reason[] = [];
    let blocklistHit = false;

    const entitiesToCheck: Array<{ type: EntityType; value: string }> = [];
    if (parsedQr?.vpa) entitiesToCheck.push({ type: 'vpa', value: parsedQr.vpa });
    if (entities?.vpas) {
      for (const v of entities.vpas) entitiesToCheck.push({ type: 'vpa', value: v });
    }
    if (entities?.phoneNumbers) {
      for (const p of entities.phoneNumbers) entitiesToCheck.push({ type: 'phone', value: p });
    }
    for (const u of uniqueUrls) {
      entitiesToCheck.push({ type: 'url', value: u });
      try {
        const parsed = new URL(u.startsWith('http') ? u : 'http://' + u);
        entitiesToCheck.push({ type: 'domain', value: parsed.hostname });
      } catch {
        // ignore
      }
    }

    const validReports = reports || [];
    for (const entity of entitiesToCheck) {
      const norm = normalizeEntityValue(entity.type, entity.value);
      const match = validReports.find(
        (r) => r.entityType === entity.type && r.value === norm
      );
      if (match) {
        blocklistHit = true;
        blocklistReasons.push({
          layer: 'web',
          severity: 'high',
          title: 'Local Blocklist Match',
          detail: 'You (or your imported list) previously reported this.',
          evidence: [`Type: ${match.entityType}`, `Reported Value: ${match.value}`, `Category: ${match.category}`],
        });
      }
    }

    // Combine Web Layer signals
    const webAvailable = urlHeuristicResult.available || onlineRepResult.available || blocklistHit;
    const webReasons: Reason[] = [
      ...urlHeuristicResult.reasons,
      ...blocklistReasons,
      ...onlineRepResult.reasons,
    ];
    const webUnknowns: string[] = [
      ...urlHeuristicResult.unknowns,
      ...onlineRepResult.unknowns,
    ];

    let webScore = 0;
    if (webAvailable) {
      const sUrl = urlHeuristicResult.score / 100;
      const sOnline = onlineRepResult.score / 100;
      const sBlocklist = blocklistHit ? 0.7 : 0;
      const combinedWeb = 1 - (1 - sUrl) * (1 - sOnline) * (1 - sBlocklist);
      webScore = Math.round(Math.min(combinedWeb, RISK_CONFIG.webCap) * 100);
    }

    const webState =
      uniqueUrls.length === 0 && !onlineRepResult.available && !blocklistHit
        ? 'not_applicable' as const
        : 'ran' as const;

    return {
      available: webAvailable,
      score: webScore,
      reasons: webReasons,
      unknowns: Array.from(new Set(webUnknowns)),
      state: webState,
    };
  });

  // 8. Compile search terms for I4C
  const allUrls: string[] = [];
  if (entities?.urls) allUrls.push(...entities.urls);
  if (parsedQr?.params?.url) allUrls.push(parsedQr.params.url);
  const uniqueUrls = Array.from(new Set(allUrls));

  const searchTerms: string[] = [];
  if (parsedQr?.vpa) searchTerms.push(parsedQr.vpa);
  if (entities?.vpas) searchTerms.push(...entities.vpas);
  if (entities?.phoneNumbers) searchTerms.push(...entities.phoneNumbers);
  for (const u of uniqueUrls) {
    try {
      const parsed = new URL(u.startsWith('http') ? u : 'http://' + u);
      searchTerms.push(parsed.hostname);
    } catch {
      searchTerms.push(u);
    }
  }

  // 9. Privacy sentOnline report
  const sentOnline = reputation?.results.map((r) => r.url) || [];

  return evaluateRisk(
    {
      rule: ruleResult,
      intent: intentResult,
      reference: referenceResult,
      language: languageResult,
      web: webResult,
    },
    {
      ocrConfidence,
      searchTerms: Array.from(new Set(searchTerms)),
      sentOnline,
      hasMessageDirection: messageStory?.direction && messageStory.direction !== 'unknown',
      hasQr: !!parsedQr,
    }
  );
}

// ─── Dev-only diagnostics (stripped from production builds) ──────────────────
export type ExplainRow = {
  layer: string;
  state: string;
  score: number;
  reasons: string[];
  // story fields where available
  direction?: string;
  amount?: number;
  action?: string;
  payeeVpa?: string;
};

export type ExplainResult = {
  rows: ExplainRow[];
  aggregation: {
    activeWeights: Record<string, number>;
    weightedSum: number;
    weighted: number;
    floor: number;
    finalScore: number;
    riskLevel: string;
  };
  verdict: import('./riskEngine').Verdict;
};

export async function explain(input: PipelineInput): Promise<ExplainResult | null> {
  if (import.meta.env.MODE === 'production') return null;

  const {
    text,
    qrPayload,
    userIntent,
    references = [],
    reputation,
    onlineCheckAttempted = false,
    ocrConfidence,
  } = input;

  const parsedQr = qrPayload && qrPayload.trim().length > 0 ? parseQrData(qrPayload) : undefined;
  const messageStory = text && text.trim().length > 0 ? parseMessage(text) : undefined;
  const entities = text && text.trim().length > 0 ? extractEntities(text) : undefined;
  const userStory = userIntent ? extractPaymentStory('user', userIntent) : undefined;
  const qrStory = parsedQr ? extractPaymentStory('qr', parsedQr) : undefined;

  const ruleResult = await safeLayer('Rule Layer', () => evaluateRuleLayer(parsedQr, text));
  const intentResult = await safeLayer('Intent Layer', () =>
    evaluateIntentLayer(userStory, messageStory, qrStory, text, parsedQr)
  );
  const referenceResult = await safeLayer('Reference Layer', () =>
    evaluateReferenceLayer({ vpa: parsedQr?.vpa, payeeName: parsedQr?.name }, references || [])
  );
  const languageResult = await safeLayer('Language Layer', () => evaluateLanguageLayer(text));

  const allUrls: string[] = [];
  if (entities?.urls) allUrls.push(...entities.urls);
  if (parsedQr?.params?.url) allUrls.push(parsedQr.params.url);
  const uniqueUrls = Array.from(new Set(allUrls));
  const urlHeuristicResult = evaluateUrlHeuristics(uniqueUrls);
  const onlineRepResult = mapReputationToLayerResult(reputation, onlineCheckAttempted);
  const webAvailable = urlHeuristicResult.available || onlineRepResult.available;
  const webScore = webAvailable
    ? Math.round(Math.min(1 - (1 - urlHeuristicResult.score / 100) * (1 - onlineRepResult.score / 100), RISK_CONFIG.webCap) * 100)
    : 0;
  const webResult = {
    available: webAvailable,
    score: webScore,
    reasons: [...urlHeuristicResult.reasons, ...onlineRepResult.reasons],
    unknowns: [...urlHeuristicResult.unknowns, ...onlineRepResult.unknowns],
    state: (uniqueUrls.length === 0 && !onlineRepResult.available ? 'not_applicable' : 'ran') as 'ran' | 'not_applicable',
  };

  const verdict = evaluateRisk(
    { rule: ruleResult, intent: intentResult, reference: referenceResult, language: languageResult, web: webResult },
    { ocrConfidence, searchTerms: [], sentOnline: [], hasMessageDirection: messageStory?.direction && messageStory.direction !== 'unknown', hasQr: !!parsedQr }
  );

  const { RISK_CONFIG: RC } = await import('./riskConfig');
  const weightMap: Record<string, number> = {
    intent: RC.layerStrength.intent,
    reference: RC.layerStrength.reference,
    language: RC.layerStrength.language,
    web: RC.layerStrength.web,
  };
  const scoringLayers = [
    { key: 'intent', layer: intentResult },
    { key: 'reference', layer: referenceResult },
    { key: 'language', layer: languageResult },
    { key: 'web', layer: webResult },
  ];
  let activeWeightSum = 0;
  let weightedScoreSum = 0;
  const activeWeights: Record<string, number> = {};
  for (const item of scoringLayers) {
    if (item.layer.available) {
      const w = weightMap[item.key];
      activeWeights[item.key] = w;
      activeWeightSum += w;
      weightedScoreSum += w * Math.max(0, Math.min(100, item.layer.score)) / 100;
    }
  }
  const weighted = activeWeightSum > 0 ? weightedScoreSum / activeWeightSum : 0;
  const hasCriticalRule = ruleResult.reasons.some(r => r.severity === 'critical');
  const hasCriticalIntent = intentResult.reasons.some(r => r.severity === 'critical');
  const floor = hasCriticalRule ? RC.floors.hardRuleCritical : hasCriticalIntent ? RC.floors.intentCritical : 0;

  const storyOf = (s?: typeof messageStory) => ({
    direction: s?.direction,
    amount: s?.amount,
    action: s?.action,
    payeeVpa: s?.payeeVpa,
  });

  const rows: ExplainRow[] = [
    { layer: 'rule',      state: ruleResult.state ?? 'ran',      score: ruleResult.score,      reasons: ruleResult.reasons.map(r => `[${r.severity}] ${r.title}`),      ...storyOf(undefined) },
    { layer: 'intent',    state: intentResult.state ?? 'ran',    score: intentResult.score,    reasons: intentResult.reasons.map(r => `[${r.severity}] ${r.title}`),    ...storyOf(messageStory) },
    { layer: 'reference', state: referenceResult.state ?? 'ran', score: referenceResult.score, reasons: referenceResult.reasons.map(r => `[${r.severity}] ${r.title}`), ...storyOf(qrStory) },
    { layer: 'language',  state: languageResult.state ?? 'ran',  score: languageResult.score,  reasons: languageResult.reasons.map(r => `[${r.severity}] ${r.title}`),  ...storyOf(undefined) },
    { layer: 'web',       state: webResult.state,                score: webResult.score,       reasons: webResult.reasons.map(r => `[${r.severity}] ${r.title}`),       ...storyOf(undefined) },
  ];

  return {
    rows,
    aggregation: {
      activeWeights,
      weightedSum: weightedScoreSum,
      weighted,
      floor,
      finalScore: verdict.score,
      riskLevel: verdict.riskLevel,
    },
    verdict,
  };
}

