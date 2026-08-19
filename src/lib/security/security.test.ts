import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimiter } from './rate-limiter';
import { scrubPII } from './pii-scrubber';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('allows requests under threshold and blocks requests over threshold', () => {
    const user = 'user-test-1';
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(user, 5).success).toBe(true);
    }
    expect(checkRateLimit(user, 5).success).toBe(false);
  });
});

describe('PII Scrubber', () => {
  it('redacts email addresses', () => {
    const input = 'Contact user john.doe@example.com for task details';
    expect(scrubPII(input)).toBe('Contact user [REDACTED_EMAIL] for task details');
  });

  it('redacts secret API keys', () => {
    const input = 'Use key sk-1234567890abcdef12345 to authenticate';
    expect(scrubPII(input)).toContain('[REDACTED_KEY]');
  });
});
