import { describe, expect, it } from 'vitest';
import { parseQrData } from './qrParser';

describe('qrParser', () => {
  it('parses a valid UPI QR', () => {
    const data = parseQrData('upi://pay?pa=merchant@okicici&pn=Super%20Store&am=500.00&cu=INR');
    expect(data.isUpiUrl).toBe(true);
    expect(data.kind).toBe('upi');
    expect(data.vpa).toBe('merchant@okicici');
    expect(data.name).toBe('Super Store');
    expect(data.amount).toBe(500);
    expect(data.warnings).toHaveLength(0);
  });

  it('parses a valid UPI QR without amount', () => {
    const data = parseQrData('upi://pay?pa=merchant@okicici&pn=Super%20Store&cu=INR');
    expect(data.isUpiUrl).toBe(true);
    expect(data.amount).toBeUndefined();
    expect(data.vpa).toBe('merchant@okicici');
    expect(data.warnings).toHaveLength(0);
  });

  it('parses a valid UPI QR with encoded characters in pn/tn', () => {
    const data = parseQrData('upi://pay?pa=merchant@okicici&pn=Super%20Store%20Private%20Limited&tn=Order%231234&am=100');
    expect(data.name).toBe('Super Store Private Limited');
    expect(data.params['tn']).toBe('Order#1234');
  });

  it('identifies non-UPI URL QR', () => {
    const data = parseQrData('https://phishing.site.xyz');
    expect(data.isUpiUrl).toBe(false);
    expect(data.kind).toBe('url');
  });

  it('handles malformed payload safely (never throws)', () => {
    const data = parseQrData('upi://pay_without_query_params');
    expect(data.isUpiUrl).toBe(true); // Technically starts with upi://
    expect(data.kind).toBe('upi'); // But parameters are missing
    expect(data.warnings).toContain('Malformed UPI payload: No query parameters found.');
  });

  it('validates handles and identifies unknown suffixes', () => {
    // Note: upi_handles.json contains "ybl", "okhdfcbank", etc.
    const data = parseQrData('upi://pay?pa=scam@unknownbank&pn=BadGuy&am=100');
    expect(data.warnings).toContain('VPA handle suffix @unknownbank is not in the known handles lexicon.');
  });
  
  it('identifies invalid VPA formatting', () => {
    const data = parseQrData('upi://pay?pa=bad@vpa@format&pn=BadGuy&am=100');
    expect(data.warnings).toContain('Invalid VPA handle format.');
  });
});
