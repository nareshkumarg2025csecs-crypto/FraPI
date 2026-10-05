import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { analyze } from '../frontend/src/engines/pipeline.js';
import type { Scenario } from './generate_scenarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runKeywordBaseline(scenario: Scenario): { isFlagged: boolean; riskLevel: string } {
  const text = (scenario.message || '').toLowerCase();
  const scamKeywords = [
    'otp', 'pin', 'winner', 'lottery', 'prize', 'refund', 'cashback',
    'registration fee', 'processing fee', 'customs', 'anydesk', 'teamviewer',
    'disconnect', 'collect request', 'pay immediately', 'urgent'
  ];
  const hit = scamKeywords.some(kw => text.includes(kw));
  return {
    isFlagged: hit,
    riskLevel: hit ? 'HIGH_RISK' : 'LOW_RISK'
  };
}

function calcMetrics(tp: number, tn: number, fp: number, fn: number) {
  const accuracy = (tp + tn) / (tp + tn + fp + fn) || 0;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = (2 * precision * recall) / (precision + recall) || 0;
  return {
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    tp, tn, fp, fn
  };
}

async function runEval() {
  const scenariosPath = path.join(__dirname, 'scenarios.json');
  if (!fs.existsSync(scenariosPath)) {
    console.error('Run generate_scenarios.ts first.');
    return;
  }

  const scenarios: Scenario[] = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
  console.log(`Loaded ${scenarios.length} scenarios. Evaluating single pass...`);

  interface EvalRecord {
    id: string;
    category: string;
    isScam: boolean;
    isHigh: boolean;
    isFlagged: boolean;
    baseFlagged: boolean;
    latency: number;
    error?: { id: string; type: 'FP' | 'FN'; category: string; expected: string; actual: string; layer: string; text: string };
  }

  const evaluated: EvalRecord[] = [];

  for (const s of scenarios) {
    const isScam = s.expectedLevel !== 'LOW_RISK';
    const t0 = performance.now();
    const verdict = await analyze({
      text: s.message,
      qrPayload: s.qrPayload,
      userIntent: s.userIntent,
      references: s.trustedRefs || [],
    });
    const t1 = performance.now();

    const isHigh = verdict.riskLevel === 'HIGH_RISK';
    const isFlagged = verdict.riskLevel === 'HIGH_RISK' || verdict.riskLevel === 'REVIEW';
    const baseline = runKeywordBaseline(s);

    let error: EvalRecord['error'] = undefined;
    if (!isScam && isFlagged) {
      const topReason = verdict.reasons[0];
      error = {
        id: s.id,
        type: 'FP',
        category: s.category,
        expected: s.expectedLevel,
        actual: verdict.riskLevel,
        layer: topReason ? topReason.layer : 'unknown',
        text: s.message,
      };
    } else if (isScam && !isFlagged) {
      error = {
        id: s.id,
        type: 'FN',
        category: s.category,
        expected: s.expectedLevel,
        actual: verdict.riskLevel,
        layer: 'none',
        text: s.message,
      };
    }

    evaluated.push({
      id: s.id,
      category: s.category,
      isScam,
      isHigh,
      isFlagged,
      baseFlagged: baseline.isFlagged,
      latency: t1 - t0,
      error,
    });
  }

  function compileMetrics(records: EvalRecord[]) {
    let tp_flag = 0, tn_flag = 0, fp_flag = 0, fn_flag = 0;
    let tp_high = 0, tn_high = 0, fp_high = 0, fn_high = 0;
    let base_tp = 0, base_tn = 0, base_fp = 0, base_fn = 0;
    const errors: NonNullable<EvalRecord['error']>[] = [];
    const latencies: number[] = [];

    for (const r of records) {
      latencies.push(r.latency);
      if (r.isScam && r.isFlagged) tp_flag++;
      if (!r.isScam && !r.isFlagged) tn_flag++;
      if (!r.isScam && r.isFlagged) fp_flag++;
      if (r.isScam && !r.isFlagged) fn_flag++;

      if (r.isScam && r.isHigh) tp_high++;
      if (!r.isScam && !r.isHigh) tn_high++;
      if (!r.isScam && r.isHigh) fp_high++;
      if (r.isScam && !r.isHigh) fn_high++;

      if (r.isScam && r.baseFlagged) base_tp++;
      if (!r.isScam && !r.baseFlagged) base_tn++;
      if (!r.isScam && r.baseFlagged) base_fp++;
      if (r.isScam && !r.baseFlagged) base_fn++;

      if (r.error) errors.push(r.error);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

    return {
      pipeline_flagged: calcMetrics(tp_flag, tn_flag, fp_flag, fn_flag),
      pipeline_high: calcMetrics(tp_high, tn_high, fp_high, fn_high),
      keyword_baseline: calcMetrics(base_tp, base_tn, base_fp, base_fn),
      avgLatencyMs: Number(avgLatency.toFixed(2)),
      errors,
    };
  }

  const tuningRecords = evaluated.filter((_, idx) => idx % 2 === 0);
  const heldOutRecords = evaluated.filter((_, idx) => idx % 2 === 1);

  const tuningResults = compileMetrics(tuningRecords);
  const heldOutResults = compileMetrics(heldOutRecords);
  const fullResults = compileMetrics(evaluated);

  const finalOutput = {
    total_scenarios: scenarios.length,
    tuning_set: {
      count: tuningRecords.length,
      pipeline: tuningResults.pipeline_flagged,
      pipeline_high_only: tuningResults.pipeline_high,
      baseline: tuningResults.keyword_baseline,
      latencyMs: tuningResults.avgLatencyMs,
      errors: tuningResults.errors,
    },
    held_out_set: {
      count: heldOutRecords.length,
      pipeline: heldOutResults.pipeline_flagged,
      pipeline_high_only: heldOutResults.pipeline_high,
      baseline: heldOutResults.keyword_baseline,
      latencyMs: heldOutResults.avgLatencyMs,
      errors: heldOutResults.errors,
    },
    full_dataset: {
      count: scenarios.length,
      pipeline: fullResults.pipeline_flagged,
      pipeline_high_only: fullResults.pipeline_high,
      baseline: fullResults.keyword_baseline,
      latencyMs: fullResults.avgLatencyMs,
      errors: fullResults.errors,
    },
    accuracy: fullResults.pipeline_flagged.accuracy,
    precision: fullResults.pipeline_flagged.precision,
    recall: fullResults.pipeline_flagged.recall,
    f1: fullResults.pipeline_flagged.f1,
  };

  const resultsPath = path.join(__dirname, 'eval-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(finalOutput, null, 2));

  const publicResultsPath = path.join(__dirname, '../frontend/public/eval-results.json');
  fs.writeFileSync(publicResultsPath, JSON.stringify(finalOutput, null, 2));

  const mdReport = `# FraPI Sentinel 2.0 Evaluation Report

> Automatically generated via \`npm run eval\` across ${scenarios.length} realistic UPI scenarios.

## 1. Held-Out Evaluation (Generalization Benchmark, N = ${heldOutRecords.length})
| Model / Pipeline | Precision | Recall | F1 Score | Accuracy |
|---|---|---|---|---|
| **FraPI Full Pipeline** | **${(heldOutResults.pipeline_flagged.precision * 100).toFixed(1)}%** | **${(heldOutResults.pipeline_flagged.recall * 100).toFixed(1)}%** | **${(heldOutResults.pipeline_flagged.f1 * 100).toFixed(1)}%** | **${(heldOutResults.pipeline_flagged.accuracy * 100).toFixed(1)}%** |
| Keyword-Only Baseline | ${(heldOutResults.keyword_baseline.precision * 100).toFixed(1)}% | ${(heldOutResults.keyword_baseline.recall * 100).toFixed(1)}% | ${(heldOutResults.keyword_baseline.f1 * 100).toFixed(1)}% | ${(heldOutResults.keyword_baseline.accuracy * 100).toFixed(1)}% |

## 2. Tuning Set Benchmark (N = ${tuningRecords.length})
| Model / Pipeline | Precision | Recall | F1 Score | Accuracy |
|---|---|---|---|---|
| **FraPI Full Pipeline** | **${(tuningResults.pipeline_flagged.precision * 100).toFixed(1)}%** | **${(tuningResults.pipeline_flagged.recall * 100).toFixed(1)}%** | **${(tuningResults.pipeline_flagged.f1 * 100).toFixed(1)}%** | **${(tuningResults.pipeline_flagged.accuracy * 100).toFixed(1)}%** |
| Keyword-Only Baseline | ${(tuningResults.keyword_baseline.precision * 100).toFixed(1)}% | ${(tuningResults.keyword_baseline.recall * 100).toFixed(1)}% | ${(tuningResults.keyword_baseline.f1 * 100).toFixed(1)}% | ${(tuningResults.keyword_baseline.accuracy * 100).toFixed(1)}% |

## 3. False Positive & False Negative Analysis (Section 32)
- **Held-Out False Positives:** ${heldOutResults.errors.filter(e => e.type === 'FP').length}
- **Held-Out False Negatives:** ${heldOutResults.errors.filter(e => e.type === 'FN').length}
${heldOutResults.errors.length === 0 ? '- Zero false positives or false negatives observed on the held-out split.' : ''}
${heldOutResults.errors.map(e => `- [${e.type}] Scenario ${e.id} (${e.category}): Caused by layer '${e.layer}'`).join('\n')}

## 4. Latency
- Average pipeline processing time: **${fullResults.avgLatencyMs.toFixed(2)} ms / scenario**
`;

  fs.writeFileSync(path.join(__dirname, 'EVAL.md'), mdReport);
  console.log(`Evaluation complete. Held-out Precision: ${(heldOutResults.pipeline_flagged.precision * 100).toFixed(1)}%, Recall: ${(heldOutResults.pipeline_flagged.recall * 100).toFixed(1)}%, F1: ${(heldOutResults.pipeline_flagged.f1 * 100).toFixed(1)}%`);
}

runEval().catch(console.error);
