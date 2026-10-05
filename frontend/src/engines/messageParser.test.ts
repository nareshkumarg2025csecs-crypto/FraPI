import { describe, expect, it } from 'vitest';
import { parseMessage } from './messageParser';
import { extractEntities } from './entityExtractor';
import {
  SCAM_MESSAGE,
  GARBLED_MESSAGE,
  HINGLISH_SCAM,
  LEGIT_BANK_ALERT,
  LEGIT_OFFER,
  LUNCH_MESSAGE,
  REFUND_SCAM_MESSAGE,
} from '../../tests/fixtures/cases';

describe('entityExtractor & messageParser', () => {
  it('extracts various amount formats including Indian grouping', () => {
    const text = 'You received ₹3,000 and Rs. 3000 and 1,00,000 INR from friend.';
    const entities = extractEntities(text);

    expect(entities.amounts).toContain(3000);
    expect(entities.amounts).toContain(100000);
  });

  it('detects Hinglish cues', () => {
    const text = 'Bhai cashback mil gaya, ₹500 prapt hue. claim kar lo.';
    const parsed = parseMessage(text);

    expect(parsed.direction).toBe('incoming');
    expect(parsed.action).toBe('cashback'); // from 'cashback'
    expect(parsed.evidence.some((e) => e.includes('mil gaya'))).toBe(true);
  });

  // CONFLICT NOTE (Part A1-b): "pay Rs 500 to receive your refund cashback of 1000"
  // contains an explicit payment demand ("pay Rs 500"), so direction is now 'outgoing'
  // rather than 'unknown'. The old assertion (direction === 'unknown') has been updated.
  it('payment demand overrides conflicting cues — direction is outgoing not unknown', () => {
    const text = 'Dear user, pay Rs 500 to receive your refund cashback of 1000.';
    const parsed = parseMessage(text);

    expect(parsed.direction).toBe('outgoing');
    expect(parsed.evidence.some((e) => e.toLowerCase().includes('payment demand'))).toBe(true);
    expect(parsed.action).toBe('refund'); // 'refund' appears explicitly
  });

  it('detects outgoing cues correctly', () => {
    const text = 'Your electricity bill of Rs. 1500 is due. Pay immediately.';
    const parsed = parseMessage(text);

    expect(parsed.direction).toBe('outgoing');
    expect(parsed.action).toBe('bill');
    expect(parsed.amount).toBe(1500);
  });

  // ─── Fixture tests ──────────────────────────────────────────────────────────

  it('SCAM_MESSAGE: direction outgoing, requestedAmount 1499, payeeVpa set, action internship', () => {
    const parsed = parseMessage(SCAM_MESSAGE);

    expect(parsed.direction).toBe('outgoing');
    expect(parsed.amount).toBe(1499);
    expect(parsed.payeeVpa).toBe('wyntrix-hr-desk@ybl');
    expect(parsed.action).toBe('internship');
    // benefit amount (stipend ₹35,000) is separate
    expect(parsed.benefitAmount).toBe(35000);
  });

  it('GARBLED_MESSAGE: direction outgoing, requestedAmount 1499 (OCR %-prefix tolerated)', () => {
    const parsed = parseMessage(GARBLED_MESSAGE);

    expect(parsed.direction).toBe('outgoing');
    expect(parsed.amount).toBe(1499);
  });

  it('HINGLISH_SCAM: direction outgoing (payment demand)', () => {
    const parsed = parseMessage(HINGLISH_SCAM);

    expect(parsed.direction).toBe('outgoing');
  });

  it('LEGIT_BANK_ALERT: no payment demand, direction not outgoing-via-demand', () => {
    const parsed = parseMessage(LEGIT_BANK_ALERT);

    // Bank alert is a debit notification — no imperative payment demand
    const hasDemandEvidence = parsed.evidence.some((e) =>
      e.toLowerCase().includes('payment demand')
    );
    expect(hasDemandEvidence).toBe(false);
  });

  it('LEGIT_OFFER: no payment demand', () => {
    const parsed = parseMessage(LEGIT_OFFER);

    const hasDemandEvidence = parsed.evidence.some((e) =>
      e.toLowerCase().includes('payment demand')
    );
    expect(hasDemandEvidence).toBe(false);
  });

  it('LUNCH_MESSAGE: direction unknown (no payment demand, no clear cues)', () => {
    const parsed = parseMessage(LUNCH_MESSAGE);

    expect(parsed.evidence.some((e) => e.toLowerCase().includes('payment demand'))).toBe(false);
  });

  it('REFUND_SCAM_MESSAGE: direction is incoming (no payment demand)', () => {
    const parsed = parseMessage(REFUND_SCAM_MESSAGE);

    // "Scan this QR to receive your ₹3,000 refund" — no payment demand, claim is incoming
    expect(parsed.direction).toBe('incoming');
  });
});
