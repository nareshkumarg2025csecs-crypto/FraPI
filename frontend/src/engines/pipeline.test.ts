import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { analyze } from './pipeline';
import type { VerifiedReference } from '../storage/references';
import {
  SCAM_MESSAGE,
  SCAM_QR,
  LUNCH_MESSAGE,
  LEGIT_BANK_ALERT,
  GARBLED_MESSAGE,
  REFUND_SCAM_MESSAGE,
  REFUND_SCAM_QR,
  HINGLISH_SCAM,
  LEGIT_OFFER
} from '../../tests/fixtures/cases';

describe('Layer 8: End-to-End Pipeline & 6 Demo Scenarios', () => {
  const savedMerchantSwiggy: VerifiedReference = {
    id: 'ref-swiggy',
    label: 'Swiggy',
    vpa: 'swiggy@icici',
    normalizedVpa: 'swiggy@icici',
    payeeName: 'Bundl Technologies Pvt Ltd',
    hash: 'hash-swiggy',
    createdAt: 1000,
    isTampered: false,
  };

  it('Scenario 1: ₹3,000 refund QR scam -> HIGH_RISK', async () => {
    const verdict = await analyze({
      text: 'Dear customer, your refund of Rs 3,000 for order cancellation is approved. Scan this QR code to receive money into your bank account immediately.',
      qrPayload: 'upi://pay?pa=fake.refund@ybl&pn=RefundDesk&am=3000&cu=INR',
      userIntent: { expectedAction: 'refund', expectedDirection: 'incoming', expectedAmount: 3000 },
      references: [savedMerchantSwiggy],
    });

    expect(verdict.riskLevel).toBe('HIGH_RISK');
    expect(verdict.score).toBeGreaterThanOrEqual(0.9);
    expect(verdict.reasons.some((r) => r.layer === 'rule' && r.severity === 'critical')).toBe(true);
    expect(verdict.i4c).toBeDefined();
    expect(verdict.i4c?.searchTerms).toContain('fake.refund@ybl');
  });

  it('Scenario 2: Genuine bank OTP alert -> LOW_RISK', async () => {
    const verdict = await analyze({
      text: 'Your OTP for login to HDFC Bank NetBanking is 592819. Do NOT share this OTP with anyone, bank never asks for OTP or password.',
    });

    expect(verdict.riskLevel).toBe('LOW_RISK');
    expect(verdict.score).toBeLessThan(0.3);
    expect(verdict.label).toBe('Low risk: no red flags found');
    expect(verdict.label.toLowerCase()).not.toContain('safe');
    expect(verdict.i4c).toBeUndefined();
  });

  it('Scenario 3: Collect-request trap -> HIGH_RISK', async () => {
    const verdict = await analyze({
      text: 'Army officer buyer: I have sent a PhonePe collect request of Rs 15,000. Please click Pay and enter UPI PIN to receive money in your account.',
      qrPayload: 'upi://pay?pa=army.buyer@okhdfcbank&pn=ArmyBuyer&am=15000&cu=INR',
      userIntent: { expectedDirection: 'incoming', expectedAmount: 15000 },
    });

    expect(verdict.riskLevel).toBe('HIGH_RISK');
    expect(verdict.score).toBeGreaterThanOrEqual(0.9);
    expect(verdict.reasons.some((r) => r.title.includes('Collect Request') || r.title.includes('Direction'))).toBe(true);
  });

  it('Scenario 4: Look-alike merchant VPA -> REVIEW or HIGH_RISK (floor >= 0.60)', async () => {
    const verdict = await analyze({
      qrPayload: 'upi://pay?pa=sw1ggy@icici&pn=Swiggy&am=450&cu=INR',
      references: [savedMerchantSwiggy],
    });

    // High severity reference homoglyph forces floor >= 0.60 -> at least REVIEW
    expect(['REVIEW', 'HIGH_RISK']).toContain(verdict.riskLevel);
    expect(verdict.score).toBeGreaterThanOrEqual(0.6);
    expect(verdict.reasons.some((r) => r.title.includes('Confusable Look-Alike'))).toBe(true);
  });

  it('Scenario 5: AnyDesk support scam -> HIGH_RISK', async () => {
    const verdict = await analyze({
      text: 'Dear customer, your bank executive needs to resolve your failed transaction. Kindly install AnyDesk app from Play Store and share the 9-digit code.',
    });

    expect(verdict.riskLevel).toBe('HIGH_RISK');
    expect(verdict.score).toBeGreaterThanOrEqual(0.9);
    expect(verdict.reasons.some((r) => r.title.includes('Remote Access'))).toBe(true);
  });

  it('Scenario 6: Matching merchant payment -> LOW_RISK', async () => {
    const verdict = await analyze({
      qrPayload: 'upi://pay?pa=swiggy@icici&pn=Bundl%20Technologies%20Pvt%20Ltd&am=450&cu=INR',
      userIntent: {
        expectedAction: 'pay',
        expectedDirection: 'outgoing',
        expectedAmount: 450,
        expectedPayeeVpa: 'swiggy@icici',
      },
      references: [savedMerchantSwiggy],
    });

    expect(verdict.riskLevel).toBe('LOW_RISK');
    expect(verdict.score).toBe(0);
    expect(verdict.reasons.some((r) => r.title.includes('Verified Saved Reference'))).toBe(true);
  });

  it('is purely deterministic: same input produces identical output', async () => {
    const input = {
      text: 'Scan QR to pay Rs 500 to restaurant',
      qrPayload: 'upi://pay?pa=rest@upi&pn=Rest&am=500',
    };

    const out1 = await analyze(input);
    const out2 = await analyze(input);

    expect(out1.score).toBe(out2.score);
    expect(out1.riskLevel).toBe(out2.riskLevel);
    expect(out1.reasons.length).toBe(out2.reasons.length);
  });

  it('T1: SCAM_MESSAGE + SCAM_QR → HIGH_RISK', async () => {
    const verdict = await analyze({ text: SCAM_MESSAGE, qrPayload: SCAM_QR });
    expect(verdict.riskLevel).toBe('HIGH_RISK');
    const reasonsStr = JSON.stringify(verdict.reasons);
    // Reasons include R8 or R9, R12, the VPA mismatch, the organisation-vs-individual payee, and the hyphen-stuffed /pay domain.
    expect(reasonsStr).toMatch(/Job|Advance Fee/i);
    expect(reasonsStr).toMatch(/Urgency/i);
    expect(verdict.reasons.some(r => r.title.includes('VPA Mismatch'))).toBe(true);
    expect(verdict.reasons.some(r => r.title.includes('Organisation vs Individual'))).toBe(true);
    expect(verdict.reasons.some(r => r.title.includes('Hyphens'))).toBe(true);
  });

  it('T2: SCAM_MESSAGE, no QR → HIGH_RISK', async () => {
    const verdict = await analyze({ text: SCAM_MESSAGE });
    expect(verdict.riskLevel).toBe('HIGH_RISK');
  });

  it('T3: LUNCH_MESSAGE + SCAM_QR → LOW_RISK', async () => {
    const verdict = await analyze({ text: LUNCH_MESSAGE, qrPayload: SCAM_QR });
    expect(verdict.riskLevel).toBe('LOW_RISK');
    expect(verdict.reasons.some(r => r.severity === 'critical')).toBe(false);
  });

  it('T4: LEGIT_BANK_ALERT → LOW_RISK', async () => {
    const verdict = await analyze({ text: LEGIT_BANK_ALERT });
    expect(verdict.riskLevel).toBe('LOW_RISK');
  });

  it('T5: GARBLED_MESSAGE + SCAM_QR → HIGH_RISK', async () => {
    const verdict = await analyze({ text: GARBLED_MESSAGE, qrPayload: SCAM_QR });
    expect(verdict.riskLevel).toBe('HIGH_RISK');
  });

  it('T6: REFUND_SCAM_MESSAGE + REFUND_SCAM_QR → HIGH_RISK', async () => {
    const verdict = await analyze({ text: REFUND_SCAM_MESSAGE, qrPayload: REFUND_SCAM_QR });
    expect(verdict.riskLevel).toBe('HIGH_RISK');
  });

  it('T7: HINGLISH_SCAM → HIGH_RISK', async () => {
    const verdict = await analyze({ text: HINGLISH_SCAM });
    expect(verdict.riskLevel).toBe('HIGH_RISK');
  });

  it('T8: LEGIT_OFFER → LOW_RISK', async () => {
    const verdict = await analyze({ text: LEGIT_OFFER });
    expect(verdict.riskLevel).toBe('LOW_RISK');
  });
});
