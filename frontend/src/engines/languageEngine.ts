import type { LayerResult, Reason, Severity } from './types';
import scamLexiconData from '../data/scam_lexicon.json' with { type: 'json' };

export interface LangModelData {
  version: string;
  intercept: number;
  platt_a?: number;
  platt_b?: number;
  vocab: Record<string, number>;
  idf: Record<string, number>;
  coef: Record<string, number>;
}

export interface LoadedModel {
  intercept: number;
  platt_a: number;
  platt_b: number;
  vocab: Map<string, number>;
  idf: Map<string, number>;
  coef: Map<string, number>;
}

let modelPromise: Promise<LoadedModel> | null = null;

export async function prewarmLanguageModel(): Promise<LoadedModel> {
  if (modelPromise) {
    return modelPromise;
  }

  modelPromise = (async () => {
    let rawModel: LangModelData | null = null;
    const proc = (globalThis as any).process;

    // In Node.js / Vitest (including jsdom) / tsx environment, read directly from disk
    if (typeof proc !== 'undefined' && proc.versions?.node) {
      try {
        const fsMod = 'fs';
        const pathMod = 'path';
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);

        const candidates = [
          path.resolve(proc.cwd(), 'frontend/public/model/lang-model.json'),
          path.resolve(proc.cwd(), 'public/model/lang-model.json'),
          path.resolve(proc.cwd(), 'frontend/src/model/lang-model.json'),
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            const fileContent = fs.readFileSync(cand, 'utf-8');
            rawModel = JSON.parse(fileContent);
            break;
          }
        }
      } catch {
        // fallback to fetch
      }
    }

    if (!rawModel) {
      const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const modelUrl = `${cleanBaseUrl}model/lang-model.json`;

      const res = await fetch(modelUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch language model: status ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType && !contentType.includes('application/json') && !contentType.includes('json')) {
        throw new Error(`Expected a JSON module script or JSON file but received Content-Type "${contentType}"`);
      }

      rawModel = (await res.json()) as LangModelData;
    }


    if (
      !rawModel ||
      typeof rawModel.version !== 'string' ||
      typeof rawModel.intercept !== 'number' ||
      !rawModel.vocab || typeof rawModel.vocab !== 'object' ||
      !rawModel.idf || typeof rawModel.idf !== 'object' ||
      !rawModel.coef || typeof rawModel.coef !== 'object'
    ) {
      throw new Error('Invalid language model format: missing or invalid top-level keys');
    }

    const vocabKeys = Object.keys(rawModel.vocab);
    const idfKeys = Object.keys(rawModel.idf);
    const coefKeys = Object.keys(rawModel.coef);

    if (
      vocabKeys.length === 0 ||
      vocabKeys.length !== idfKeys.length ||
      vocabKeys.length !== coefKeys.length
    ) {
      throw new Error(
        `Invalid language model payload: mismatched vocab (${vocabKeys.length}), idf (${idfKeys.length}), and coef (${coefKeys.length}) lengths`
      );
    }

    return {
      intercept: rawModel.intercept,
      platt_a: rawModel.platt_a ?? 1,
      platt_b: rawModel.platt_b ?? 0,
      vocab: new Map(Object.entries(rawModel.vocab)),
      idf: new Map(Object.entries(rawModel.idf)),
      coef: new Map(Object.entries(rawModel.coef)),
    };
  })();

  return modelPromise;
}

// Reset cache helper for testing failure scenarios
export function _resetModelCache() {
  modelPromise = null;
}

export interface TermContribution {
  term: string;
  contribution: number;
}

export interface PredictionResult {
  probability: number;
  score: number;
  topPositiveTerms: TermContribution[];
  matchedLexiconTerms: string[];
}

export function preprocessText(text: string): string {
  if (!text) return '';
  // 1. HTML unescape & strip tags
  let t = text.replace(/<[^>]+>/g, ' ');
  // 2. URLs -> urltoken
  t = t.replace(/https?:\/\/\S+|www\.\S+|bit\.ly\/\S+|tinyurl\.com\/\S+/gi, 'urltoken');
  // 3. Emails -> emailtoken
  t = t.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, 'emailtoken');
  // 4. Long numbers (>=4 digits) -> numtoken
  t = t.replace(/\b\d{4,}\b/g, 'numtoken');
  // 5. Lowercase (ensures all tokens match vectorizer vocabulary)
  t = t.toLowerCase();
  // 6. Collapse whitespace
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function tokenizeAndExtractNgrams(text: string): string[] {
  const matches = text.match(/\b\w\w+\b/g);
  if (!matches) return [];

  const ngrams: string[] = [...matches];
  for (let i = 0; i < matches.length - 1; i++) {
    ngrams.push(`${matches[i]} ${matches[i + 1]}`);
  }
  return ngrams;
}

export async function predictProbability(
  rawText: string
): Promise<PredictionResult> {
  const model = await prewarmLanguageModel();
  
  const cleaned = preprocessText(rawText);
  const ngrams = tokenizeAndExtractNgrams(cleaned);

  const counts = new Map<string, number>();
  for (const g of ngrams) {
    if (model.vocab.has(g)) {
      counts.set(g, (counts.get(g) || 0) + 1);
    }
  }

  let sumSq = 0;
  const tfidfMap = new Map<string, number>();
  for (const [term, count] of counts.entries()) {
    const tf = 1 + Math.log(count);
    const tfidf = tf * (model.idf.get(term) ?? 0);
    tfidfMap.set(term, tfidf);
    sumSq += tfidf * tfidf;
  }

  const norm = Math.sqrt(sumSq);
  let dotProduct = 0;
  const termContributions: TermContribution[] = [];

  for (const [term, val] of tfidfMap.entries()) {
    const normalizedTfidf = norm > 0 ? val / norm : 0;
    const c = model.coef.get(term) ?? 0;
    const contrib = normalizedTfidf * c;
    dotProduct += contrib;
    if (contrib > 0) {
      termContributions.push({ term, contribution: contrib });
    }
  }

  const z = dotProduct + model.intercept;
  const calibZ = z * model.platt_a + model.platt_b;
  const probability = 1 / (1 + Math.exp(-calibZ));

  termContributions.sort((a, b) => b.contribution - a.contribution);
  const topPositiveTerms = termContributions.slice(0, 5);

  // Check rule-based lexicon
  const lowerRaw = rawText.toLowerCase();
  const matchedLexicon: string[] = [];
  const lexiconObj = scamLexiconData as Record<string, string[]>;
  for (const phrases of Object.values(lexiconObj)) {
    for (const phrase of phrases) {
      if (lowerRaw.includes(phrase.toLowerCase()) && !matchedLexicon.includes(phrase)) {
        matchedLexicon.push(phrase);
      }
    }
  }

  return {
    probability,
    score: Math.round(probability * 100),
    topPositiveTerms,
    matchedLexiconTerms: matchedLexicon,
  };
}

export async function evaluateLanguageLayer(
  messageText?: string
): Promise<LayerResult> {
  if (!messageText || messageText.trim().length === 0) {
    return {
      available: false,
      score: 0,
      reasons: [],
      unknowns: ['No message text available for language analysis.'],
    };
  }

  try {
    const pred = await predictProbability(messageText);
    const reasons: Reason[] = [];

    // Severity never exceeds 'medium' for this layer per specifications
    if (pred.matchedLexiconTerms.length > 0) {
      reasons.push({
        layer: 'language',
        severity: 'medium',
        title: 'Pressure or Threat Language Detected',
        detail: 'This message uses pressure language commonly seen in scams.',
        evidence: pred.matchedLexiconTerms,
      });
    }

    if (pred.probability >= 0.5) {
      const severity: Severity = 'medium';
      reasons.push({
        layer: 'language',
        severity,
        title: 'Deceptive Language Patterns Detected',
        detail: 'This message uses vocabulary and phrasing statistically correlated with scams and phishing.',
        evidence: pred.topPositiveTerms.map((t) => `${t.term} (+${t.contribution.toFixed(3)})`),
      });
    } else if (pred.matchedLexiconTerms.length === 0) {
      reasons.push({
        layer: 'language',
        severity: 'info',
        title: 'Standard Transaction Language',
        detail: 'The message wording is typical of normal notifications and does not show high scam pressure.',
        evidence: [],
      });
    }

    const layerScore =
      pred.probability < 0.5 && pred.matchedLexiconTerms.length === 0
        ? Math.round(pred.score * 0.5)
        : pred.score;

    return {
      available: true,
      score: layerScore,
      reasons,
      unknowns: [],
    };

  } catch (err) {
    console.error('Language model load/evaluation failed:', err);
    return {
      available: false,
      score: 0,
      reasons: [],
      unknowns: ['The language model could not be loaded'],
    };
  }
}
