import { describe, it, expect } from 'vitest';
import { extractUrlsAndDomains } from './entityExtractor';
import { SCAM_MESSAGE } from '../../tests/fixtures/cases';

describe('Layer 6: Entity Extractor & URL Normalizer', () => {
  it('parses Markdown links: [Pay now](http://a.com/pay)', () => {
    const text = 'Please click here to [Pay now](http://a.com/pay) for refund.';
    const res = extractUrlsAndDomains(text);

    expect(res.urls).toEqual(['http://a.com/pay']);
    expect(res.domains).toEqual(['a.com']);
  });

  it('handles bare URL with trailing punctuation: http://a.com/pay).', () => {
    const text = 'Visit http://a.com/pay). to complete transaction.';
    const res = extractUrlsAndDomains(text);

    expect(res.urls).toEqual(['http://a.com/pay']);
  });

  it('handles parenthesized URL: (http://a.com/pay)', () => {
    const text = 'Check out this portal (http://a.com/pay) for details.';
    const res = extractUrlsAndDomains(text);

    expect(res.urls).toEqual(['http://a.com/pay']);
  });

  it('deduplicates identical URLs', () => {
    const text = 'Link 1: http://a.com/pay and Link 2: http://a.com/pay/ and Markdown [Pay](http://a.com/pay)';
    const res = extractUrlsAndDomains(text);

    expect(res.urls).toEqual(['http://a.com/pay']);
  });

  it('preserves query strings and drops fragments: http://a.com/pay?user=123#step2', () => {
    const text = 'Go to http://a.com/pay?user=123#step2';
    const res = extractUrlsAndDomains(text);

    expect(res.urls).toEqual(['http://a.com/pay?user=123']);
  });

  it('rejects invalid URLs gracefully', () => {
    const text = 'This is not-a-url or ftp://invalid-scheme.com or http://';
    const res = extractUrlsAndDomains(text);

    expect(res.urls).toEqual([]);
  });

  it('caps extracted URLs at 5 max', () => {
    const text = 'http://1.com http://2.com http://3.com http://4.com http://5.com http://6.com http://7.com';
    const res = extractUrlsAndDomains(text);

    expect(res.urls.length).toBe(5);
    expect(res.urls).toEqual([
      'http://1.com/',
      'http://2.com/',
      'http://3.com/',
      'http://4.com/',
      'http://5.com/',
    ]);
  });

  it('SCAM_MESSAGE must produce exactly 1 URL', () => {
    const res = extractUrlsAndDomains(SCAM_MESSAGE);
    expect(res.urls.length).toBe(1);
    expect(res.urls).toEqual(['http://wyntrix-careers-portal-vip.com/pay']);
  });
});
