import { describe, expect, it } from 'vitest';

import { sanitizeUrl } from '../shared-url-sanitizer';

describe('sanitizeUrl', () => {
  it('should redact state and code parameters', () => {
    const url =
      'http://localhost:5173/auth/callback/google?state=%7B%22random%22%3A%2227a1b810-914v-4d1e-9cb6-50b2b8d18b35%22%7D&code=4%2F0Ab_5qln-BVyyIHOm4AgL2qbBY_SGiTbI3fuud23xyLNBz8eXB02FuTDU5yFN5tA6Py7Q_w&scope=email+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&hd=ansearch.net&prompt=none';
    const expected =
      'http://localhost:5173/auth/callback/google?state=REDACTED&code=REDACTED&scope=email+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&hd=ansearch.net&prompt=none';
    expect(sanitizeUrl({ url })).toBe(expected);
  });

  it('should not change URL if no sensitive parameters are present', () => {
    const url = 'https://example.com/path?other=keep&another=val';
    const expected = 'https://example.com/path?other=keep&another=val';
    expect(sanitizeUrl({ url })).toBe(expected);
  });

  it('should handle URLs with no query parameters', () => {
    const url = 'https://example.com/path';
    const expected = 'https://example.com/path';
    expect(sanitizeUrl({ url })).toBe(expected);
  });

  it('should handle URLs with only a hash', () => {
    const url = 'https://example.com/path#section';
    const expected = 'https://example.com/path#section';
    expect(sanitizeUrl({ url })).toBe(expected);
  });

  it('should return the original URL if parsing fails', () => {
    const invalidUrl = 'invalid-url-string';
    expect(sanitizeUrl({ url: invalidUrl })).toBe(invalidUrl);
  });

  it('should handle parameters with similar names correctly', () => {
    const url = 'https://example.com/path?state_id=123&other=keep';
    const expected = 'https://example.com/path?state_id=123&other=keep';
    expect(sanitizeUrl({ url })).toBe(expected);
  });
});
