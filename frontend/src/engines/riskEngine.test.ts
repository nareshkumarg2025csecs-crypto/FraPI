import { describe, it, expect } from 'vitest';
import { evaluateRisk, type LayerBreakdown } from './riskEngine';
import type { LayerResult } from './types';

function createMockLayer(
  available: boolean,
  score: number,
  reasons: any[] = [],
  state?: 'ran' | 'not_applicable' | 'failed'
): LayerResult {
  return {
    available,
    score,
    reasons,
    unknowns: [],
    state: state ?? (available ? 'ran' : 'not_applicable'),
  };
}

describe('Layer 8: Risk Engine', () => {
  it('critical hard rule forces HIGH_RISK (floor >= 0.90) even if all other layers are 0', () => {
    const layers: LayerBreakdown = {
      rule: createMockLayer(true, 100, [
        { layer: 'rule', severity: 'critical', title: 'Payment Direction Inversion', detail: '...', evidence: [] },
      ]),
      intent: createMockLayer(false, 0),
      reference: createMockLayer(false, 0),
      language: createMockLayer(true, 0),
      web: createMockLayer(false, 0),
    };

    const verdict = evaluateRisk(layers);
    expect(verdict.riskLevel).toBe('HIGH_RISK');
    expect(verdict.score).toBeGreaterThanOrEqual(0.9);
  });

  it('genuine bank OTP alert produces LOW_RISK with required wording', () => {
    const layers: LayerBreakdown = {
      rule: createMockLayer(true, 0),
      intent: createMockLayer(false, 0),
      reference: createMockLayer(false, 0),
      language: createMockLayer(true, 15, [
        { layer: 'language', severity: 'info', title: 'Normal Message Language', detail: '...', evidence: [] },
      ]),
      web: createMockLayer(false, 0),
    };

    const verdict = evaluateRisk(layers);
    expect(verdict.riskLevel).toBe('LOW_RISK');
    expect(verdict.label).toBe('Low risk: no red flags found');
    expect(verdict.label.toLowerCase()).not.toContain('safe');
    expect(verdict.i4c).toBeUndefined();
  });

  it('language-only high score caps at 0.64 (REVIEW at most, never HIGH_RISK)', () => {
    const layers: LayerBreakdown = {
      rule: createMockLayer(true, 0), // No critical rule
      intent: createMockLayer(false, 0),
      reference: createMockLayer(false, 0),
      language: createMockLayer(true, 95, [
        { layer: 'language', severity: 'medium', title: 'Scam Language Pattern', detail: '...', evidence: [] },
      ]),
      web: createMockLayer(false, 0),
    };

    const verdict = evaluateRisk(layers);
    expect(verdict.riskLevel).toBe('REVIEW');
    expect(verdict.score).toBeLessThanOrEqual(0.64);
    expect(verdict.i4c).toBeDefined(); // I4C included for REVIEW
  });

  it('exact-match merchant reference produces LOW_RISK', () => {
    const layers: LayerBreakdown = {
      rule: createMockLayer(true, 0),
      intent: createMockLayer(true, 0),
      reference: createMockLayer(true, 0, [
        { layer: 'reference', severity: 'info', title: 'Verified Saved Reference', detail: '...', evidence: [] },
      ]),
      language: createMockLayer(false, 0),
      web: createMockLayer(false, 0),
    };

    const verdict = evaluateRisk(layers);
    expect(verdict.riskLevel).toBe('LOW_RISK');
    expect(verdict.score).toBe(0);
  });

  it('renormalises missing layers without treating them as zero', () => {
    // Only intent layer available with score 50 (0.50)
    const layers: LayerBreakdown = {
      rule: createMockLayer(false, 0),
      intent: createMockLayer(true, 50),
      reference: createMockLayer(false, 0),
      language: createMockLayer(false, 0),
      web: createMockLayer(false, 0),
    };

    const verdict = evaluateRisk(layers);
    // Since only intent is available, weight = 100% of available weights -> score = 0.50
    expect(verdict.score).toBe(0.5);
    expect(verdict.riskLevel).toBe('REVIEW');
  });

  it('confidence scales with number of available layers', () => {
    // 1 layer -> limited
    const v1 = evaluateRisk({
      rule: createMockLayer(false, 0),
      intent: createMockLayer(false, 0),
      reference: createMockLayer(false, 0),
      language: createMockLayer(true, 0),
      web: createMockLayer(false, 0),
    });
    expect(v1.confidence).toBe('limited');

    // 2-3 layers -> moderate
    const v2 = evaluateRisk({
      rule: createMockLayer(true, 0),
      intent: createMockLayer(true, 0),
      reference: createMockLayer(false, 0),
      language: createMockLayer(false, 0),
      web: createMockLayer(false, 0),
    });
    expect(v2.confidence).toBe('moderate');

    // 4+ layers -> good
    const v3 = evaluateRisk({
      rule: createMockLayer(true, 0),
      intent: createMockLayer(true, 0),
      reference: createMockLayer(true, 0),
      language: createMockLayer(true, 0),
      web: createMockLayer(false, 0),
    });
    expect(v3.confidence).toBe('good');
  });

  it('state: 4 ran → good (no failed)', () => {
    const v = evaluateRisk({
      rule: createMockLayer(true, 0, [], 'ran'),
      intent: createMockLayer(true, 0, [], 'ran'),
      reference: createMockLayer(true, 0, [], 'ran'),
      language: createMockLayer(true, 0, [], 'ran'),
      web: createMockLayer(false, 0, [], 'not_applicable'),
    });
    expect(v.confidence).toBe('good');
  });

  it('state: 4 ran + 1 failed → moderate (one level penalty)', () => {
    const v = evaluateRisk({
      rule: createMockLayer(true, 0, [], 'ran'),
      intent: createMockLayer(true, 0, [], 'ran'),
      reference: createMockLayer(true, 0, [], 'ran'),
      language: createMockLayer(true, 0, [], 'ran'),
      web: createMockLayer(false, 0, [], 'failed'),
    });
    expect(v.confidence).toBe('moderate');
  });

  it('state: default setup (reputation OFF, 4 layers ran) → good', () => {
    // Simulates: rule, intent, language, web(url heuristics) ran; reference not_applicable (no VPA)
    const v = evaluateRisk({
      rule: createMockLayer(true, 0, [], 'ran'),
      intent: createMockLayer(true, 0, [], 'ran'),
      reference: createMockLayer(false, 0, [], 'not_applicable'),
      language: createMockLayer(true, 0, [], 'ran'),
      web: createMockLayer(false, 0, [], 'ran'),
    });
    expect(v.confidence).toBe('good');
  });

  it('sorts reasons strictly by severity descending then layer order', () => {
    const layers: LayerBreakdown = {
      rule: createMockLayer(true, 0, [
        { layer: 'rule', severity: 'low', title: 'Rule Low', detail: '...', evidence: [] },
      ]),
      intent: createMockLayer(true, 0, [
        { layer: 'intent', severity: 'critical', title: 'Intent Critical', detail: '...', evidence: [] },
      ]),
      reference: createMockLayer(true, 0, [
        { layer: 'reference', severity: 'high', title: 'Ref High', detail: '...', evidence: [] },
      ]),
      language: createMockLayer(true, 0, [
        { layer: 'language', severity: 'medium', title: 'Lang Medium', detail: '...', evidence: [] },
      ]),
      web: createMockLayer(false, 0),
    };

    const verdict = evaluateRisk(layers);
    expect(verdict.reasons[0].severity).toBe('critical');
    expect(verdict.reasons[1].severity).toBe('high');
    expect(verdict.reasons[2].severity).toBe('medium');
    expect(verdict.reasons[3].severity).toBe('low');
  });
});
