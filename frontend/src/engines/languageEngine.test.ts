import { describe, it, expect, vi } from 'vitest';
import {
  evaluateLanguageLayer,
  predictProbability,
  preprocessText,
  tokenizeAndExtractNgrams,
  _resetModelCache,
} from './languageEngine';
import parityFixtures from '../../../ml/artifacts/parity_fixtures.json' with { type: 'json' };

describe('Layer 5B: Language Engine in the Browser', () => {
  describe('Exact Scikit-Learn Parity Test', () => {
    it('asserts that TypeScript probability is within 1e-4 of sklearn probability for all 60 fixtures', async () => {
      expect(parityFixtures.length).toBeGreaterThanOrEqual(50);

      for (let i = 0; i < parityFixtures.length; i++) {
        const fixture = parityFixtures[i];
        const res = await predictProbability(fixture.text);
        const diff = Math.abs(res.probability - fixture.sklearn_prob);

        if (diff > 1e-4) {
          console.error(
            `Parity divergence on fixture #${i}:`,
            `\nText: "${fixture.text}"`,
            `\nSklearn prob: ${fixture.sklearn_prob}`,
            `\nTypeScript prob: ${res.probability}`,
            `\nDiff: ${diff}`
          );
        }

        expect(
          diff,
          `Fixture #${i} failed parity check. Text: "${fixture.text.slice(0, 50)}..."`
        ).toBeLessThanOrEqual(1e-4);
      }
    });
  });

  describe('Preprocessing & N-gram Tokenizer', () => {
    it('replaces URLs, emails, long numbers and collapses whitespace', () => {
      const input = 'Call 9876543210 or email test@gmail.com visit http://scam.in now!';
      const cleaned = preprocessText(input);
      expect(cleaned).toContain('numtoken');
      expect(cleaned).toContain('emailtoken');
      expect(cleaned).toContain('urltoken');
      expect(cleaned).not.toContain('9876543210');
      expect(cleaned).not.toContain('test@gmail.com');
      expect(cleaned).not.toContain('http://scam.in');
    });

    it('extracts unigrams and bigrams correctly', () => {
      const ngrams = tokenizeAndExtractNgrams('swiggy food delivery');
      expect(ngrams).toEqual(['swiggy', 'food', 'delivery', 'swiggy food', 'food delivery']);
    });
  });

  describe('Semantic & Threat Testing', () => {
    it('genuine OTP alert scores low and does not flag scam', async () => {
      const genuineOtp =
        'Your OTP for login to HDFC Bank NetBanking is 592819. Do NOT share this OTP with anyone, bank never calls for OTP.';
      const res = await evaluateLanguageLayer(genuineOtp);

      expect(res.available).toBe(true);
      expect(res.score).toBeLessThan(35); // Low risk
      expect(res.reasons.some((r) => r.severity === 'critical' || r.severity === 'high')).toBe(false);
    });

    it('Hinglish KYC-expiry message scores high with matched threat lexicon', async () => {
      const hinglishKyc =
        'Priya grahak, aapka SBI account block ho jayega turant KYC update karein http://sbi-kyc.in';
      const res = await evaluateLanguageLayer(hinglishKyc);

      expect(res.available).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(70); // High probability
      expect(res.reasons.some((r) => r.title.includes('Pressure or Threat Language'))).toBe(true);
      expect(res.reasons.every((r) => r.severity !== 'critical' && r.severity !== 'high')).toBe(true);
    });

    it('returns top 5 positive terms as explainability evidence', async () => {
      const scamMsg =
        'URGENT NOTICE: Your electricity connection line will be disconnected tonight at 9:30 PM call electricity office 9876543210';
      const pred = await predictProbability(scamMsg);

      expect(pred.topPositiveTerms.length).toBeGreaterThan(0);
      expect(pred.topPositiveTerms.length).toBeLessThanOrEqual(5);
      expect(pred.topPositiveTerms[0].contribution).toBeGreaterThan(0);
    });

    it('severity never exceeds medium for Language Layer', async () => {
      const superScam =
        'Dear customer, your bank account blocked today due to pending KYC update immediately or power disconnected tonight call 9876543210';
      const res = await evaluateLanguageLayer(superScam);

      expect(res.available).toBe(true);
      for (const reason of res.reasons) {
        expect(['info', 'low', 'medium']).toContain(reason.severity);
      }
    });

    it('handles empty message gracefully', async () => {
      const res = await evaluateLanguageLayer('');
      expect(res.available).toBe(false);
      expect(res.score).toBe(0);
      expect(res.unknowns.length).toBeGreaterThan(0);
    });

    it('returns available:false with "The language model could not be loaded" note if load fails', async () => {
      _resetModelCache();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
      });
      
      const oldProcess = (globalThis as any).process;
      (globalThis as any).process = undefined;

      const res = await evaluateLanguageLayer('Test message');
      expect(res.available).toBe(false);
      expect(res.unknowns).toContain('The language model could not be loaded');

      (globalThis as any).process = oldProcess;
      globalThis.fetch = originalFetch;
      _resetModelCache();
    });
  });
});
