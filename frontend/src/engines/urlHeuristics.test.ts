import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateUrlHeuristics,
  isIpAddress,
  checkBrandLookalike,
} from './urlHeuristics';
import {
  addReport,
  listReports,
  checkEntity,
  exportJSON,
  importJSON,
  clearAllReports,
  seedKnownBad,
} from '../storage/reports';

describe('Layer 6: Local URL Checks & Blocklist Storage', () => {
  describe('URL Heuristics Checks', () => {
    it('flags known shortener domains', () => {
      const res = evaluateUrlHeuristics('http://bit.ly/kyc-update');
      expect(res.available).toBe(true);
      expect(res.reasons.some((r) => r.title.includes('URL Shortener'))).toBe(true);
      expect(res.score).toBeGreaterThan(0);
    });

    it('flags IP address hosts', () => {
      expect(isIpAddress('192.168.1.50')).toBe(true);
      expect(isIpAddress('google.com')).toBe(false);

      const res = evaluateUrlHeuristics('http://45.33.32.156/pay');
      expect(res.available).toBe(true);
      expect(res.reasons.some((r) => r.title.includes('IP Address Host'))).toBe(true);
    });

    it('flags punycode internationalized domains (xn--)', () => {
      const res = evaluateUrlHeuristics('https://xn--paytm-qqa.com/login');
      expect(res.available).toBe(true);
      expect(res.reasons.some((r) => r.title.includes('Punycode'))).toBe(true);
    });

    it('flags excessive subdomains', () => {
      const res = evaluateUrlHeuristics('https://login.auth.secure.update.mybank.evil.com/reset');
      expect(res.available).toBe(true);
      expect(res.reasons.some((r) => r.title.includes('Excessive Subdomain'))).toBe(true);
    });

    it('flags suspicious TLDs (.xyz, .top, .live)', () => {
      const res = evaluateUrlHeuristics('https://bill-payment-portal.xyz/pay');
      expect(res.available).toBe(true);
      expect(res.reasons.some((r) => r.title.includes('High-Risk Top-Level Domain'))).toBe(true);
    });

    it('flags brand-name lookalike token inside a non-official domain', () => {
      const check1 = checkBrandLookalike('sbi-kyc-update.com');
      expect(check1.isLookalike).toBe(true);
      expect(check1.brand).toBe('sbi');

      const checkOfficial = checkBrandLookalike('onlinesbi.sbi');
      expect(checkOfficial.isLookalike).toBe(false);

      const res = evaluateUrlHeuristics('https://paytm-refund-desk.in/claim');
      expect(res.available).toBe(true);
      expect(res.reasons.some((r) => r.title.includes('Brand Impersonation'))).toBe(true);
      expect(res.reasons.some((r) => r.evidence.some((e) => e.includes('paytm')))).toBe(true);
    });

    it('flags "@" symbol in URL', () => {
      const res = evaluateUrlHeuristics('https://google.com@phishing-target.com/login');
      expect(res.available).toBe(true);
      expect(res.reasons.some((r) => r.title.includes('Misleading "@" Symbol'))).toBe(true);
    });

    it('flags unencrypted HTTP protocol', () => {
      const res = evaluateUrlHeuristics('http://normal-blog.org/article');
      expect(res.available).toBe(true);
      expect(res.reasons.some((r) => r.title.includes('Unencrypted Connection (HTTP)'))).toBe(true);
    });

    it('does NOT flag a normal HTTPS site with a real brand domain', () => {
      const res = evaluateUrlHeuristics('https://www.hdfcbank.com/personal/ways-to-bank/online-banking');
      expect(res.available).toBe(true);
      expect(res.score).toBe(0);
      expect(res.reasons[0].severity).toBe('info');
      expect(res.reasons[0].title).toBe('Standard Domain Structure');

      const resSwiggy = evaluateUrlHeuristics('https://swiggy.com/restaurants/biryani-blues');
      expect(resSwiggy.score).toBe(0);
    });

    it('flags domains with 2 or more hyphens', () => {
      const res = evaluateUrlHeuristics('https://my-secure-portal.com/login');
      expect(res.reasons.some((r) => r.title.includes('Multiple Hyphens'))).toBe(true);
    });

    it('flags scam words combined with action paths', () => {
      const res = evaluateUrlHeuristics('https://wyntrix-careers-portal-vip.com/pay');
      expect(res.reasons.some((r) => r.title.includes('Suspicious Keywords and Action Path'))).toBe(true);
    });

    it('caps the heuristic score to a maximum of 0.60 (60 points)', () => {
      // Combination of HTTP + IP + suspicious TLD + shortener + brand lookalike + @ + hyphens + scam word
      const nastyUrl = 'http://paytm-portal-vip@45.33.32.156.xyz/pay';
      const res = evaluateUrlHeuristics(nastyUrl);
      expect(res.score).toBeLessThanOrEqual(60);
    });

    it('handles empty or missing input gracefully', () => {
      const res = evaluateUrlHeuristics([]);
      expect(res.available).toBe(false);
      expect(res.score).toBe(0);
    });
  });

  describe('Local Blocklist Storage (reports.ts)', () => {
    beforeEach(async () => {
      await clearAllReports();
    });

    it('seeds known bad entities on first run', async () => {
      await seedKnownBad(true);
      const list = await listReports();
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.some((r) => r.entityType === 'vpa' && r.value === 'fake.refund@ybl')).toBe(true);
    });

    it('returns score 70 (0.7) and exact Reason wording for blocklist hit', async () => {
      await addReport({
        entityType: 'vpa',
        value: 'scam.seller@okaxis',
        category: 'upi_fraud',
      });

      const check = await checkEntity({ type: 'vpa', value: 'SCAM.SELLER@OKAXIS' });
      expect(check.hit).toBe(true);
      expect(check.score).toBe(70);
      expect(check.reason?.title).toBe('Local Blocklist Match');
      expect(check.reason?.detail).toBe('You (or your imported list) previously reported this.');
      expect(check.reason?.detail).not.toContain('confirmed scam');
    });

    it('returns hit=false for unlisted entities', async () => {
      const check = await checkEntity({ type: 'vpa', value: 'innocent@upi' });
      expect(check.hit).toBe(false);
      expect(check.score).toBe(0);
    });

    it('round-trips exportJSON and importJSON with schema validation', async () => {
      await addReport({
        entityType: 'domain',
        value: 'fake-kyc.com',
        category: 'phishing',
      });
      await addReport({
        entityType: 'phone',
        value: '+919876543210',
        category: 'fake_helpline',
      });

      const exportedStr = await exportJSON();
      expect(exportedStr).toContain('fake-kyc.com');
      expect(exportedStr).toContain('+919876543210');

      // Clear and re-import
      await clearAllReports();
      const importRes = await importJSON(exportedStr);
      expect(importRes.importedCount).toBe(2);
      expect(importRes.errors.length).toBe(0);

      const verifiedList = await listReports();
      expect(verifiedList.length).toBe(2);
      expect(verifiedList.some((r) => r.value === 'fake-kyc.com')).toBe(true);
    });

    it('rejects invalid schema upon importJSON', async () => {
      const invalidJson = JSON.stringify([
        { invalidField: 'missing entityType and value' },
        { entityType: 'unsupported_type', value: '123' },
        { entityType: 'vpa', value: '' }, // empty value
      ]);

      const res = await importJSON(invalidJson);
      expect(res.importedCount).toBe(0);
      expect(res.errors.length).toBe(3);
    });
  });
});
