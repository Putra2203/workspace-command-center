interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const tracker = new Map<string, RateLimitRecord>();

/**
 * In-memory sliding window rate limiter for API protection.
 * Defaults to max 30 requests per minute per identifier.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { success: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = tracker.get(identifier);

  if (!record || now > record.resetTime) {
    tracker.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetMs: windowMs };
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0, resetMs: record.resetTime - now };
  }

  record.count++;
  return { success: true, remaining: maxRequests - record.count, resetMs: record.resetTime - now };
}

export function resetRateLimiter(): void {
  tracker.clear();
}
