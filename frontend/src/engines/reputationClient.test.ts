import { describe, it, expect, vi } from 'vitest';
import {
  checkReputationOnline,
  extractReputationTargets,
  mapReputationToLayerResult,
  type ReputationApiResponse,
} from './reputationClient';

describe('Layer 7: Web Reputation Client', () => {
  describe('Payload & Privacy Checks', () => {
    it('extracts unique valid URLs and domain names for pre-consent UI display', () => {
      const targets = extractReputationTargets([
        'https://paytm.com/recharge',
        'https://paytm.com/bills',
        'http://45.33.32.156/login',
        'invalid-url-string',
      ]);

      expect(targets.urlsToSend).toEqual([
        'https://paytm.com/recharge',
        'https://paytm.com/bills',
        'http://45.33.32.156/login',
      ]);
      expect(targets.domainsToSend).toContain('paytm.com');
      expect(targets.domainsToSend).toContain('45.33.32.156');
      expect(targets.urlsToSend.length).toBeLessThanOrEqual(5);
    });

    it('makes NO network request when toggle is disabled', async () => {
      const mockFetch = vi.fn();
      const res = await checkReputationOnline(['https://example.com'], false, mockFetch as unknown as typeof fetch);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(res.success).toBe(false);
      expect(res.error).toContain('disabled by user setting');
    });

    it('calls endpoint when toggle is enabled', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              url: 'https://example.com',
              domain: 'example.com',
              gsb: { status: 'ok', threatTypes: [] },
              vt: { status: 'ok', malicious: 0, suspicious: 0, harmless: 70, undetected: 5, reputation: 0 },
              cached: false,
            },
          ],
        }),
      });

      const res = await checkReputationOnline(['https://example.com'], true, mockFetch as unknown as typeof fetch);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(res.success).toBe(true);
      expect(res.data?.results.length).toBe(1);
    });

    it('handles network failure gracefully without throwing', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
      const res = await checkReputationOnline(['https://example.com'], true, mockFetch as unknown as typeof fetch);

      expect(res.success).toBe(false);
      expect(res.error).toContain('Network offline');
    });
  });

  describe('Reputation LayerResult Mapping', () => {
    it('maps Google Safe Browsing flagged hit to score 90 (0.9)', () => {
      const mockData: ReputationApiResponse = {
        results: [
          {
            url: 'https://testsafebrowsing.appspot.com/s/phishing.html',
            domain: 'testsafebrowsing.appspot.com',
            gsb: { status: 'ok', threatTypes: ['SOCIAL_ENGINEERING'] },
            vt: { status: 'ok', malicious: 0, suspicious: 0, harmless: 10, undetected: 0, reputation: 0 },
            cached: false,
          },
        ],
      };

      const layerRes = mapReputationToLayerResult(mockData, true);
      expect(layerRes.available).toBe(true);
      expect(layerRes.score).toBe(90);
      expect(layerRes.reasons.some((r) => r.title.includes('Google Safe Browsing'))).toBe(true);
      expect(layerRes.reasons[0].severity).toBe('critical');
    });

    it('maps VirusTotal malicious >= 3 to 80 (0.8)', () => {
      const mockData: ReputationApiResponse = {
        results: [
          {
            url: 'https://malicious-site.com',
            domain: 'malicious-site.com',
            gsb: { status: 'ok', threatTypes: [] },
            vt: { status: 'ok', malicious: 5, suspicious: 0, harmless: 5, undetected: 0, reputation: -20 },
            cached: false,
          },
        ],
      };

      const layerRes = mapReputationToLayerResult(mockData, true);
      expect(layerRes.available).toBe(true);
      expect(layerRes.score).toBe(80);
      expect(layerRes.reasons.some((r) => r.title.includes('Multiple Antivirus Vendors'))).toBe(true);
    });

    it('maps VirusTotal malicious 1-2 to 50 (0.5)', () => {
      const mockData: ReputationApiResponse = {
        results: [
          {
            url: 'https://suspicious-site.com',
            domain: 'suspicious-site.com',
            gsb: { status: 'ok', threatTypes: [] },
            vt: { status: 'ok', malicious: 2, suspicious: 0, harmless: 40, undetected: 0, reputation: 0 },
            cached: false,
          },
        ],
      };

      const layerRes = mapReputationToLayerResult(mockData, true);
      expect(layerRes.available).toBe(true);
      expect(layerRes.score).toBe(50);
    });

    it('combines multiple hits with noisy-OR and caps at 90 (0.9)', () => {
      const mockData: ReputationApiResponse = {
        results: [
          {
            url: 'https://dual-flagged.com',
            domain: 'dual-flagged.com',
            gsb: { status: 'ok', threatTypes: ['MALWARE'] }, // 0.9
            vt: { status: 'ok', malicious: 10, suspicious: 2, harmless: 0, undetected: 0, reputation: -50 }, // 0.8
            cached: false,
          },
        ],
      };

      const layerRes = mapReputationToLayerResult(mockData, true);
      // Noisy-OR: 1 - (1-0.9)*(1-0.8) = 1 - 0.02 = 0.98 -> capped at 0.90
      expect(layerRes.score).toBe(90);
    });

    it('returns score 0 and limitation notice when clean or empty', () => {
      const mockClean: ReputationApiResponse = {
        results: [
          {
            url: 'https://clean-site.com',
            domain: 'clean-site.com',
            gsb: { status: 'ok', threatTypes: [] },
            vt: { status: 'ok', malicious: 0, suspicious: 0, harmless: 80, undetected: 0, reputation: 10 },
            cached: false,
          },
        ],
      };

      const layerRes = mapReputationToLayerResult(mockClean, true);
      expect(layerRes.available).toBe(true);
      expect(layerRes.score).toBe(0);
      expect(layerRes.unknowns).toContain('No reputation data found. This does not mean it is safe.');
    });

    it('returns available: false when online check was not attempted', () => {
      const layerRes = mapReputationToLayerResult(undefined, false);
      expect(layerRes.available).toBe(false);
      expect(layerRes.score).toBe(0);
      expect(layerRes.unknowns).toContain('No reputation data found. This does not mean it is safe.');
    });
  });
});
