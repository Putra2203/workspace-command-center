/**
 * Scrubs sensitive personally identifiable information (PII) and secret keys
 * before sending prompts to external generative AI services.
 */
export function scrubPII(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // 1. Scrub emails
  cleaned = cleaned.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');

  // 2. Scrub API keys / Bearer tokens (e.g. sk-..., bearer ...)
  cleaned = cleaned.replace(/\b(bearer\s+|sk-|api_key=)[A-Za-z0-9_-]{16,}\b/gi, '[REDACTED_KEY]');

  // 3. Scrub credit card numbers (13 to 16 digits)
  cleaned = cleaned.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD]');

  return cleaned;
}
