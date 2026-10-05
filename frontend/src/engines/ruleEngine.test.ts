import { describe, expect, it } from 'vitest';
import { evaluateRuleLayer } from './ruleEngine';
import { parseQrData } from './qrParser';
import {
  SCAM_MESSAGE,
  GARBLED_MESSAGE,
  HINGLISH_SCAM,
  LEGIT_BANK_ALERT,
  LEGIT_OFFER,
  LUNCH_MESSAGE,
  REFUND_SCAM_MESSAGE,
  REFUND_SCAM_QR,
} from '../../tests/fixtures/cases';

describe('Layer 2: Rule Engine', () => {
  // ─── R1 ───────────────────────────────────────────────────────────────────
  it('R1: fires on "share your OTP to get the refund"', () => {
    const text = 'Share your OTP to get the refund of Rs 5000 in your account.';
    const result = evaluateRuleLayer(undefined, text);
    const r1 = result.reasons.find((r) => r.title === 'Request to share sensitive credentials');
    expect(r1).toBeDefined();
    expect(r1?.severity).toBe('critical');
  });

  it('R1 Look-Alike Trap: does NOT fire on genuine bank OTP SMS with do not share warning', () => {
    const text = 'Your SBI OTP is 123456. Do not share your OTP with anyone. Bank will never ask for it.';
    const result = evaluateRuleLayer(undefined, text);
    const r1 = result.reasons.find((r) => r.title === 'Request to share sensitive credentials');
    expect(r1).toBeUndefined();
  });

  // ─── R2 ───────────────────────────────────────────────────────────────────
  it('R2: fires on "scan this QR to receive Rs 3000" with an upi://pay QR', () => {
    const qr = parseQrData('upi://pay?pa=scammer@ybl&pn=scam&am=3000.00');
    const text = 'Scan this QR to receive Rs 3000 cashback reward.';
    const result = evaluateRuleLayer(qr, text);
    const r2 = result.reasons.find((r) => r.title === 'Payment direction mismatch (Scan to Receive)');
    expect(r2).toBeDefined();
    expect(r2?.severity).toBe('critical');
  });

  it('R2 Look-Alike Trap: does NOT fire on normal merchant payment QR with pay intent', () => {
    const qr = parseQrData('upi://pay?pa=restaurant@okaxis&pn=CityDiner&am=450');
    const text = 'Pay Rs 450 to City Diner for order #42.';
    const result = evaluateRuleLayer(qr, text);
    const r2 = result.reasons.find((r) => r.title === 'Payment direction mismatch (Scan to Receive)');
    expect(r2).toBeUndefined();
  });

  // ─── R3 ───────────────────────────────────────────────────────────────────
  it('R3: fires on "accept the collect request to receive cashback"', () => {
    const text = 'Accept the request on PhonePe to receive cashback of Rs 500.';
    const result = evaluateRuleLayer(undefined, text);
    const r3 = result.reasons.find((r) => r.title === 'Collect Request Fraud');
    expect(r3).toBeDefined();
    expect(r3?.severity).toBe('critical');
  });

  it('R3 Look-Alike Trap: does NOT fire on legitimate outgoing bill split request', () => {
    const text = 'Hey Rahul, I have sent a request to collect your share of dinner Rs 350.';
    const result = evaluateRuleLayer(undefined, text);
    const r3 = result.reasons.find((r) => r.title === 'Collect Request Fraud');
    expect(r3).toBeUndefined();
  });

  // ─── R4 ───────────────────────────────────────────────────────────────────
  it('R4: fires on "enter UPI PIN to get refund"', () => {
    const text = 'Enter your UPI PIN to get the refund processed immediately.';
    const result = evaluateRuleLayer(undefined, text);
    const r4 = result.reasons.find((r) => r.title === 'Entering PIN to receive money');
    expect(r4).toBeDefined();
    expect(r4?.severity).toBe('critical');
  });

  it('R4 Look-Alike Trap: does NOT fire on security advisory mentioning PIN safety', () => {
    const text = 'Bank alert: UPI PIN is only needed to send money. Never share your PIN.';
    const result = evaluateRuleLayer(undefined, text);
    const r4 = result.reasons.find((r) => r.title === 'Entering PIN to receive money');
    expect(r4).toBeUndefined();
  });

  // ─── R5 ───────────────────────────────────────────────────────────────────
  it('R5: fires on "download AnyDesk and tell me the code"', () => {
    const text = 'Download AnyDesk app and tell me the code so I can help you with refund.';
    const result = evaluateRuleLayer(undefined, text);
    const r5 = result.reasons.find((r) => r.title === 'Remote Access App detected');
    expect(r5).toBeDefined();
    expect(r5?.severity).toBe('critical');
  });

  it('R5 Look-Alike Trap: does NOT fire on normal customer support message without remote tools', () => {
    const text = 'HDFC Support: Your ticket #99281 has been resolved. Contact branch for questions.';
    const result = evaluateRuleLayer(undefined, text);
    const r5 = result.reasons.find((r) => r.title === 'Remote Access App detected');
    expect(r5).toBeUndefined();
  });

  // ─── R6 ───────────────────────────────────────────────────────────────────
  it('R6: fires on "install APK link"', () => {
    const text = 'Please install this app to update KYC https://scam.site/app.apk';
    const result = evaluateRuleLayer(undefined, text);
    const r6 = result.reasons.find((r) => r.title === 'Suspicious App Download');
    expect(r6).toBeDefined();
    expect(r6?.severity).toBe('critical');
  });

  it('R6 Look-Alike Trap: does NOT fire on plain payment confirmation without APK', () => {
    const text = 'Paid Rs 150 for grocery at Supermart.';
    const result = evaluateRuleLayer(undefined, text);
    const r6 = result.reasons.find((r) => r.title === 'Suspicious App Download');
    expect(r6).toBeUndefined();
  });

  // ─── R7 ───────────────────────────────────────────────────────────────────
  it('R7: fires on suspicious shortened link with payment request', () => {
    const text = 'Your package is on hold. Pay delivery fee Rs 10 here: http://bit.ly/track-pkg';
    const result = evaluateRuleLayer(undefined, text);
    const r7 = result.reasons.find((r) => r.title === 'Suspicious Web Link');
    expect(r7).toBeDefined();
    expect(r7?.severity).toBe('medium');
  });

  it('R7 Look-Alike Trap: does NOT fire on standard official banking URL', () => {
    const text = 'Check your account statement on https://www.hdfcbank.com';
    const result = evaluateRuleLayer(undefined, text);
    const r7 = result.reasons.find((r) => r.title === 'Suspicious Web Link');
    expect(r7).toBeUndefined();
  });

  // ─── R8 ───────────────────────────────────────────────────────────────────
  it('R8: fires on advance fee fraud (lottery/job with registration fee)', () => {
    const text = 'Congratulations! You are selected as winner. Pay registration fee of Rs 499 to claim.';
    const result = evaluateRuleLayer(undefined, text);
    const r8 = result.reasons.find((r) => r.title === 'Advance Fee Fraud');
    expect(r8).toBeDefined();
    expect(r8?.severity).toBe('critical');
  });

  it('R8 Look-Alike Trap: does NOT fire on legitimate course tuition fee receipt', () => {
    const text = 'Receipt: Paid registration fee of Rs 500 for the AI Python workshop.';
    const result = evaluateRuleLayer(undefined, text);
    const r8 = result.reasons.find((r) => r.title === 'Advance Fee Fraud');
    expect(r8).toBeUndefined();
  });

  // ─── R9 ───────────────────────────────────────────────────────────────────
  it('R9: fires on job/internship scam demanding payment', () => {
    const text = 'We offer work from home job. Pay Rs 2000 for training kit to start.';
    const result = evaluateRuleLayer(undefined, text);
    const r8or9 = result.reasons.find((r) => r.title === 'Job or Internship Scam' || r.title === 'Advance Fee Fraud');
    expect(r8or9).toBeDefined();
    expect(r8or9?.severity).toBe('critical');
  });

  it('R9 Look-Alike Trap: does NOT fire on legitimate job offer with stipend and no fees', () => {
    const text = 'Congratulations on your offer letter for Software Intern with stipend of Rs 30,000 per month.';
    const result = evaluateRuleLayer(undefined, text);
    const r9 = result.reasons.find((r) => r.title === 'Job or Internship Scam');
    expect(r9).toBeUndefined();
  });

  // ─── R10 ──────────────────────────────────────────────────────────────────
  it('R10: fires on pay to claim fraud', () => {
    const text = 'To claim your prize reward of Rs 25000, pay first Rs 1000 processing fee.';
    const result = evaluateRuleLayer(undefined, text);
    const r10 = result.reasons.find((r) => r.title === 'Pay-to-Claim Fraud' || r.title === 'Advance Fee Fraud');
    expect(r10).toBeDefined();
    expect(r10?.severity).toBe('critical');
  });

  it('R10 Look-Alike Trap: does NOT fire on legitimate in-store prize collection', () => {
    const text = 'You won a coupon! Visit our retail store with photo ID to claim your gift voucher.';
    const result = evaluateRuleLayer(undefined, text);
    const r10 = result.reasons.find((r) => r.title === 'Pay-to-Claim Fraud');
    expect(r10).toBeUndefined();
  });

  // ─── R11 ──────────────────────────────────────────────────────────────────
  it('R11: fires on token payment to verify account', () => {
    const text = 'Please send Rs 1 to test and verify your account activation.';
    const result = evaluateRuleLayer(undefined, text);
    const r11 = result.reasons.find((r) => r.title === 'Token Payment to Verify Account');
    expect(r11).toBeDefined();
    expect(r11?.severity).toBe('critical');
  });

  it('R11 Look-Alike Trap: does NOT fire on standard salary credit alert', () => {
    const text = 'Your monthly salary of Rs 65,000 has been credited to your bank account.';
    const result = evaluateRuleLayer(undefined, text);
    const r11 = result.reasons.find((r) => r.title === 'Token Payment to Verify Account');
    expect(r11).toBeUndefined();
  });

  // ─── R12 ──────────────────────────────────────────────────────────────────
  it('R12: fires on artificial urgency with payment demand', () => {
    const text = 'Pay Rs 500 immediately or your account will be blocked within 10 minutes.';
    const result = evaluateRuleLayer(undefined, text);
    const r12 = result.reasons.find((r) => r.title === 'Artificial Urgency with Payment Demand');
    expect(r12).toBeDefined();
  });

  it('R12 Look-Alike Trap: does NOT fire on standard friendly dinner reminder', () => {
    const text = 'Hey, lunch was awesome today! See you tomorrow at 10 AM.';
    const result = evaluateRuleLayer(undefined, text);
    const r12 = result.reasons.find((r) => r.title === 'Artificial Urgency with Payment Demand');
    expect(r12).toBeUndefined();
  });

  // ─── R13 ──────────────────────────────────────────────────────────────────
  it('R13: fires on service threat with payment or action demand', () => {
    const text = 'Dear user, your electricity power will be disconnect tonight. Pay bill immediately to avoid disconnection.';
    const result = evaluateRuleLayer(undefined, text);
    const r13 = result.reasons.find((r) => r.title === 'Service Threat with Payment or Action Demand');
    expect(r13).toBeDefined();
    expect(r13?.severity).toBe('high');
  });

  it('R13 Look-Alike Trap: does NOT fire on paid electricity bill receipt', () => {
    const text = 'Your electricity bill payment of Rs 1,420 was received successfully. Thank you.';
    const result = evaluateRuleLayer(undefined, text);
    const r13 = result.reasons.find((r) => r.title === 'Service Threat with Payment or Action Demand');
    expect(r13).toBeUndefined();
  });

  // ─── R14 ──────────────────────────────────────────────────────────────────
  it('R14: fires on parcel or customs fee scam', () => {
    const text = 'Your parcel package is detained at customs. Pay customs charge Rs 500 to release.';
    const result = evaluateRuleLayer(undefined, text);
    const r14 = result.reasons.find((r) => r.title === 'Parcel or Customs Fee Scam');
    expect(r14).toBeDefined();
    expect(r14?.severity).toBe('high');
  });

  it('R14 Look-Alike Trap: does NOT fire on standard package delivery notification', () => {
    const text = 'Your courier package tracking #78901 was delivered to your security desk.';
    const result = evaluateRuleLayer(undefined, text);
    const r14 = result.reasons.find((r) => r.title === 'Parcel or Customs Fee Scam');
    expect(r14).toBeUndefined();
  });

  // ─── Hinglish & Garbled Fixtures ───────────────────────────────────────────
  it('fires R1 on Hinglish credential theft', () => {
    const text = 'Sir refund claim karne ke liye apna OTP bataye or whatsapp pe bhejo.';
    const result = evaluateRuleLayer(undefined, text);
    const r1 = result.reasons.find((r) => r.title === 'Request to share sensitive credentials');
    expect(r1).toBeDefined();
    expect(r1?.severity).toBe('critical');
  });

  it('R8 or R9 fires on SCAM_MESSAGE (internship fee scam)', () => {
    const result = evaluateRuleLayer(undefined, SCAM_MESSAGE);
    const r8or9 = result.reasons.find(
      (r) => r.title === 'Advance Fee Fraud' || r.title === 'Job or Internship Scam'
    );
    expect(r8or9).toBeTruthy();
    expect(r8or9!.severity).toBe('critical');
  });

  it('R8 or R9 fires on GARBLED_MESSAGE', () => {
    const result = evaluateRuleLayer(undefined, GARBLED_MESSAGE);
    const criticals = result.reasons.filter((r) => r.severity === 'critical');
    expect(criticals.length).toBeGreaterThan(0);
  });

  it('R8 or R9 fires on HINGLISH_SCAM', () => {
    const result = evaluateRuleLayer(undefined, HINGLISH_SCAM);
    const r8or9 = result.reasons.find(
      (r) => r.title === 'Advance Fee Fraud' || r.title === 'Job or Internship Scam'
    );
    expect(r8or9).toBeDefined();
    expect(r8or9?.severity).toBe('critical');
  });

  it('LEGIT_BANK_ALERT: no critical rule fires', () => {
    const result = evaluateRuleLayer(undefined, LEGIT_BANK_ALERT);
    const criticals = result.reasons.filter((r) => r.severity === 'critical');
    expect(criticals.length).toBe(0);
  });

  it('LEGIT_OFFER: no critical rule fires', () => {
    const result = evaluateRuleLayer(undefined, LEGIT_OFFER);
    const criticals = result.reasons.filter((r) => r.severity === 'critical');
    expect(criticals.length).toBe(0);
  });

  it('LUNCH_MESSAGE: no critical rule fires', () => {
    const result = evaluateRuleLayer(undefined, LUNCH_MESSAGE);
    const criticals = result.reasons.filter((r) => r.severity === 'critical');
    expect(criticals.length).toBe(0);
  });

  it('REFUND_SCAM_MESSAGE + QR: R2 still fires (unchanged behavior)', () => {
    const qr = parseQrData(REFUND_SCAM_QR);
    const result = evaluateRuleLayer(qr, REFUND_SCAM_MESSAGE);
    const r2 = result.reasons.find((r) => r.title === 'Payment direction mismatch (Scan to Receive)');
    expect(r2).toBeDefined();
    expect(r2?.severity).toBe('critical');
  });
});
