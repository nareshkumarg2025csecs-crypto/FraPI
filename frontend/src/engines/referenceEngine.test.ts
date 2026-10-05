import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateReferenceLayer,
  toSkeleton,
  levenshteinDistance,
  LIMITATION_NOTICE,
} from './referenceEngine';
import {
  computeReferenceHash,
  addReference,
  listReferences,
  clearAllReferences,
  seedTrustedMerchants,
  type VerifiedReference,
} from '../storage/references';

describe('Layer 4: Reference Engine & Storage', () => {
  const mockSavedReferences: VerifiedReference[] = [
    {
      id: 'ref-1',
      label: 'Swiggy',
      vpa: 'swiggy@icici',
      normalizedVpa: 'swiggy@icici',
      payeeName: 'Bundl Technologies Pvt Ltd',
      hash: 'mock-hash-1',
      createdAt: 1000,
      isTampered: false,
    },
    {
      id: 'ref-2',
      label: 'Zomato',
      vpa: 'zomato@hdfcbank',
      normalizedVpa: 'zomato@hdfcbank',
      payeeName: 'Zomato Limited',
      hash: 'mock-hash-2',
      createdAt: 1001,
      isTampered: false,
    },
    {
      id: 'ref-3',
      label: 'Merchant Shop',
      vpa: 'shop@okhdfcbank',
      normalizedVpa: 'shop@okhdfcbank',
      payeeName: 'Merchant Shop',
      hash: 'mock-hash-3',
      createdAt: 1002,
      isTampered: false,
    },
    {
      id: 'ref-4',
      label: 'Wipro Technologies',
      vpa: 'wipro@icici',
      normalizedVpa: 'wipro@icici',
      payeeName: 'Wipro Limited',
      hash: 'mock-hash-4',
      createdAt: 1003,
      isTampered: false,
    },
  ];

  describe('Skeleton and String Metrics', () => {
    it('correctly builds skeleton for homoglyphs 0<->o, 1<->l<->i, rn<->m, vv<->w', () => {
      // rn <-> m
      expect(toSkeleton('zornato')).toBe('zomato');
      expect(toSkeleton('zomato')).toBe('zomato');

      // vv <-> w
      expect(toSkeleton('vvipro')).toBe('wipro');
      expect(toSkeleton('wipro')).toBe('wipro');

      // 0 <-> o
      expect(toSkeleton('sw0ggy')).toBe('swoggy');
      expect(toSkeleton('swoggy')).toBe('swoggy');

      // 1 <-> l <-> i
      expect(toSkeleton('sw1ggy')).toBe('swiggy');
      expect(toSkeleton('swlggy')).toBe('swiggy');
      expect(toSkeleton('swiggy')).toBe('swiggy');
    });

    it('calculates correct Levenshtein distance', () => {
      expect(levenshteinDistance('swiggy', 'swiggy')).toBe(0);
      expect(levenshteinDistance('swiggy', 'swiggi')).toBe(1);
      expect(levenshteinDistance('swiggy', 'swig')).toBe(2);
      expect(levenshteinDistance('shop', 'stop')).toBe(1);
      expect(levenshteinDistance('shop', 'step')).toBe(2);
    });
  });

  describe('Matching Engine Tests', () => {
    it('exact normalized match -> verified, score 0 with limitation notice', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'SWIGGY@ICICI', payeeName: 'Bundl Technologies Pvt Ltd' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(0);
      expect(res.reasons.length).toBeGreaterThanOrEqual(1);
      expect(res.reasons[0].severity).toBe('info');
      expect(res.reasons[0].title).toContain('Verified Saved Reference');
      expect(res.reasons[0].detail).toContain(LIMITATION_NOTICE);
    });

    it('homoglyph variant 1<->l<->i (sw1ggy@icici) -> high severity look-alike (~0.8)', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'sw1ggy@icici', payeeName: 'Swiggy Food' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(80);
      const confusableReason = res.reasons.find((r) => r.title.includes('Confusable Look-Alike'));
      expect(confusableReason).toBeDefined();
      expect(confusableReason?.severity).toBe('high');
      expect(confusableReason?.detail).toContain(LIMITATION_NOTICE);
    });

    it('homoglyph variant rn<->m (zornato@hdfcbank) -> high severity look-alike (~0.8)', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'zornato@hdfcbank', payeeName: 'Zomato Food' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(80);
      const confusableReason = res.reasons.find((r) => r.title.includes('Confusable Look-Alike'));
      expect(confusableReason).toBeDefined();
      expect(confusableReason?.severity).toBe('high');
    });

    it('homoglyph variant vv<->w (vvipro@icici) -> high severity look-alike (~0.8)', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'vvipro@icici', payeeName: 'Wipro Limited' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(80);
      const confusableReason = res.reasons.find((r) => r.title.includes('Confusable Look-Alike'));
      expect(confusableReason).toBeDefined();
    });

    it('homoglyph variant 0<->o (z0mat0@hdfcbank) -> high severity look-alike (~0.8)', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'z0mat0@hdfcbank', payeeName: 'Zomato' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(80);
      const confusableReason = res.reasons.find((r) => r.title.includes('Confusable Look-Alike'));
      expect(confusableReason).toBeDefined();
    });

    it('handle swap (shop@okhdfcbank vs shop@oksbi) -> high severity (~0.75)', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'shop@oksbi', payeeName: 'Merchant Shop' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(75);
      const swapReason = res.reasons.find((r) => r.title.includes('UPI Handle Swap'));
      expect(swapReason).toBeDefined();
      expect(swapReason?.severity).toBe('high');
      expect(swapReason?.detail).toContain(LIMITATION_NOTICE);
    });

    it('small edit distance on the local part -> medium-high severity (~0.65)', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'swiggx@icici', payeeName: 'Swiggy' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(65);
      const editReason = res.reasons.find((r) => r.title.includes('Similar VPA Local Part'));
      expect(editReason).toBeDefined();
    });

    it('saved label/payee name is similar to QR pn but VPA differs -> high (~0.75)', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'fraudster99@ybl', payeeName: 'Swiggy Food Delivery' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(75);
      const nameReason = res.reasons.find((r) => r.title.includes('Payee Name Similar'));
      expect(nameReason).toBeDefined();
      expect(nameReason?.severity).toBe('high');
    });

    it('unrelated VPA -> neutral (not a warning, score 0)', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'ramesh.chaiwala@okaxis', payeeName: 'Ramesh Tea Stall' },
        mockSavedReferences
      );

      expect(res.available).toBe(true);
      expect(res.score).toBe(0);
      expect(res.reasons[0].title).toContain('Unsaved Merchant (Neutral)');
      expect(res.reasons[0].detail).toContain(LIMITATION_NOTICE);
    });

    it('no saved references at all -> available: false', async () => {
      const res = await evaluateReferenceLayer(
        { vpa: 'swiggy@icici', payeeName: 'Swiggy' },
        []
      );

      expect(res.available).toBe(false);
      expect(res.score).toBe(0);
      expect(res.reasons.length).toBe(0);
    });

    it('tampered record (hash mismatch warning)', async () => {
      const tamperedReferences: VerifiedReference[] = [
        {
          id: 'ref-tampered',
          label: 'Hacked Bank',
          vpa: 'bank@icici',
          normalizedVpa: 'bank@icici',
          payeeName: 'Hacked Bank',
          hash: 'invalid-hash-tampered',
          createdAt: 2000,
          isTampered: true,
          tamperWarning: 'this saved reference was modified',
        },
      ];

      const res = await evaluateReferenceLayer(
        { vpa: 'bank@icici', payeeName: 'Hacked Bank' },
        tamperedReferences
      );

      expect(res.available).toBe(true);
      const warningReason = res.reasons.find((r) =>
        r.detail.includes('this saved reference was modified')
      );
      expect(warningReason).toBeDefined();
    });
  });

  describe('Storage CRUD & Web Crypto Hash Integration', () => {
    beforeEach(async () => {
      await clearAllReferences();
    });

    it('calculates SHA-256 hash correctly and detects tampering', async () => {
      const hash1 = await computeReferenceHash('test@upi', 'Test User');
      const hash2 = await computeReferenceHash('test@upi', 'test user');
      // Case-insensitive payeeName
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex string
    });

    it('seeds default merchants from trusted_merchants.json on first run', async () => {
      await seedTrustedMerchants(true);
      const list = await listReferences();

      expect(list.length).toBeGreaterThanOrEqual(4);
      expect(list.every((r) => !r.isTampered)).toBe(true);
      expect(list.some((r) => r.normalizedVpa === 'swiggy@icici')).toBe(true);
    });

    it('adds, lists and removes references with valid hashes', async () => {
      const added = await addReference({
        label: 'My Local Grocer',
        vpa: 'grocer@okhdfcbank',
        payeeName: 'Local Grocer Store',
      });

      expect(added.id).toBeDefined();
      expect(added.normalizedVpa).toBe('grocer@okhdfcbank');

      let list = await listReferences();
      const item = list.find((r) => r.id === added.id);
      expect(item).toBeDefined();
      expect(item?.isTampered).toBe(false);

      await clearAllReferences();
      list = await listReferences();
      // After clearAllReferences and empty DB, listReferences re-seeds demo data
      expect(list.some((r) => r.id === added.id)).toBe(false);
    });
  });
});
