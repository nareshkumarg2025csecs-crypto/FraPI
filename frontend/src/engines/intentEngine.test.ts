import { describe, expect, it } from 'vitest';
import { evaluateIntentLayer } from './intentEngine';
import type { PaymentStory } from './types';
import { LUNCH_MESSAGE, SCAM_MESSAGE, SCAM_QR } from '../../tests/fixtures/cases';
import { parseQrData } from './qrParser';
import { parseMessage } from './messageParser';

describe('Layer 3: Intent Engine', () => {
  it('detects the ₹3,000 refund QR scam (critical direction contradiction)', () => {
    const msgStory: PaymentStory = {
      source: 'message',
      direction: 'incoming',
      amount: 3000,
      action: 'refund',
      confidence: 1,
      evidence: []
    };
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      amount: 3000,
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    
    const result = evaluateIntentLayer(undefined, msgStory, qrStory);
    
    expect(result.available).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    
    const mismatch = result.reasons.find(r => r.title === 'Contradictory Payment Flow (Direction Mismatch)');
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe('critical');
    expect(mismatch?.detail).toContain('Message Claim indicates money is going INCOMING, but QR Code Action shows money going OUTGOING.');
  });

  it('user says Pay + QR outgoing is consistent', () => {
    const userStory: PaymentStory = {
      source: 'user',
      direction: 'outgoing',
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    
    const result = evaluateIntentLayer(userStory, undefined, qrStory);
    expect(result.available).toBe(true);
    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  it('detects amount mismatch 3000 vs 5000', () => {
    const userStory: PaymentStory = {
      source: 'user',
      direction: 'outgoing',
      amount: 3000,
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      amount: 5000,
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    
    const result = evaluateIntentLayer(userStory, undefined, qrStory);
    expect(result.score).toBe(75);
    
    const mismatch = result.reasons.find(r => r.title === 'Amount Discrepancy');
    expect(mismatch).toBeDefined();
  });

  it('QR with no amount yields unknown, not contradiction', () => {
    const userStory: PaymentStory = {
      source: 'user',
      direction: 'outgoing',
      amount: 3000,
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      // amount is missing
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    
    const result = evaluateIntentLayer(userStory, undefined, qrStory);
    expect(result.score).toBe(0);
    expect(result.unknowns.some(u => u.includes('amounts'))).toBe(true);
    expect(result.reasons.length).toBe(0);
  });

  it('only one story present returns available:true but no score (if fact exists)', () => {
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      amount: 3000,
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    
    const result = evaluateIntentLayer(undefined, undefined, qrStory);
    expect(result.available).toBe(true);
    expect(result.score).toBe(0);
  });

  it('message direction unknown yields no contradiction', () => {
    const msgStory: PaymentStory = {
      source: 'message',
      direction: 'unknown',
      amount: 3000,
      action: 'unknown',
      confidence: 1,
      evidence: []
    };
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      amount: 3000,
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    
    const result = evaluateIntentLayer(undefined, msgStory, qrStory);
    expect(result.score).toBe(0);
    expect(result.unknowns.some(u => u.includes('direction'))).toBe(true);
  });

  it('two simultaneous contradictions combine below 1.0 (noisy-OR)', () => {
    const msgStory: PaymentStory = {
      source: 'message',
      direction: 'incoming', // direction mismatch (0.90)
      amount: 3000,
      action: 'refund',
      confidence: 1,
      evidence: []
    };
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      amount: 5000, // amount mismatch (0.75)
      action: 'pay',
      confidence: 1,
      evidence: []
    };
    
    const result = evaluateIntentLayer(undefined, msgStory, qrStory);
    
    // score = 1 - (1 - 0.90) * (1 - 0.75) * (1 - 0.50) = 1 - 0.0125 = 0.9875 => 98.75
    expect(result.score).toBeCloseTo(98.75);
    expect(result.reasons.length).toBe(3); // direction(0.9) + amount(0.75) + action(0.50)
  });

  it('SCAM_MESSAGE + SCAM_QR: VPA mismatch and org vs individual mismatch', () => {
    const msgStory = parseMessage(SCAM_MESSAGE);
    const parsedQr = parseQrData(SCAM_QR);
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      amount: 1499,
      action: 'pay',
      confidence: 1,
      evidence: [],
      payeeVpa: parsedQr.vpa,
      payeeName: parsedQr.name
    };
    const result = evaluateIntentLayer(undefined, msgStory, qrStory, SCAM_MESSAGE, parsedQr);

    expect(result.available).toBe(true);
    
    const vpaMismatch = result.reasons.find(r => r.title === 'Payee VPA Mismatch');
    expect(vpaMismatch).toBeDefined();
    expect(vpaMismatch?.severity).toBe('high');
    
    const orgMismatch = result.reasons.find(r => r.title === 'Organisation vs Individual Mismatch');
    expect(orgMismatch).toBeDefined();
    expect(orgMismatch?.severity).toBe('high');
  });

  it('LUNCH_MESSAGE + SCAM_QR: no contradiction', () => {
    const msgStory = parseMessage(LUNCH_MESSAGE);
    const parsedQr = parseQrData(SCAM_QR);
    const qrStory: PaymentStory = {
      source: 'qr',
      direction: 'outgoing',
      amount: 1499,
      action: 'pay',
      confidence: 1,
      evidence: [],
      payeeVpa: parsedQr.vpa,
      payeeName: parsedQr.name
    };

    const result = evaluateIntentLayer(undefined, msgStory, qrStory, LUNCH_MESSAGE, parsedQr);
    expect(result.reasons.length).toBe(0);
  });
});
