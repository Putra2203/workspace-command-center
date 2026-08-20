import crypto from 'crypto';

export const AUTH_COOKIE_NAME = 'plane_cmd_auth_session';

export function getExpectedToken(): string {
  const user = process.env.ADMIN_USERNAME || 'admin';
  const pwd = process.env.ADMIN_PASSWORD || 'admin';
  const secret = process.env.AUTH_SECRET || 'plane-command-center-secret-salt';
  return crypto.createHash('sha256').update(`${user}:${pwd}:${secret}`).digest('hex');
}

export function isValidAuthToken(token?: string): boolean {
  if (!token) return false;
  return token === getExpectedToken();
}
