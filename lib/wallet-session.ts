import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export const CHALLENGE_COOKIE = 'landville_wallet_challenge';
export const SESSION_COOKIE = 'landville_wallet_session';

type ChallengePayload = {
  address: string;
  message: string;
  expiresAt: number;
};

type SessionPayload = {
  address: string;
  expiresAt: number;
};

export class WalletSessionConfigurationError extends Error {
  constructor() { super('Wallet sign-in is not configured. The site operator must set WALLET_SESSION_SECRET to at least 32 random characters in Production, then redeploy.'); }
}

export function walletSessionConfigured() {
  return (process.env.WALLET_SESSION_SECRET?.trim().length || 0) >= 32;
}

function secret() {
  const configured = process.env.WALLET_SESSION_SECRET;
  if (configured && (process.env.NODE_ENV !== 'production' || walletSessionConfigured())) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new WalletSessionConfigurationError();
  }
  return 'landville-local-development-only';
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

type CookiePurpose = 'challenge' | 'session';

function signature(payload: string, purpose: CookiePurpose) {
  // Domain separation also invalidates every legacy, untyped cookie.
  return createHmac('sha256', secret()).update(`landville:auth:v2:${purpose}:${payload}`).digest('base64url');
}

function sealCookie(value: ChallengePayload | SessionPayload, purpose: CookiePurpose) {
  const payload = encode(value);
  return `${payload}.${signature(payload, purpose)}`;
}

function readCookie(value: string | undefined, purpose: CookiePurpose): ChallengePayload | SessionPayload | null {
  if (!value || value.length > 4096) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [payload, suppliedSignature] = parts;
  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(suppliedSignature)) return null;

  const expected = Buffer.from(signature(payload, purpose));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return null;
    const record = decoded as Record<string, unknown>;
    if (typeof record.address !== 'string' || !/^0x[0-9a-f]{40}$/.test(record.address) ||
      typeof record.expiresAt !== 'number' || !Number.isSafeInteger(record.expiresAt) || record.expiresAt <= Date.now()) return null;
    const allowed = purpose === 'challenge' ? ['address', 'expiresAt', 'message'] : ['address', 'expiresAt'];
    if (Object.keys(record).some((key) => !allowed.includes(key))) return null;
    if (purpose === 'challenge') {
      if (typeof record.message !== 'string' || !record.message || record.message.length > 2048) return null;
      return { address: record.address, expiresAt: record.expiresAt, message: record.message };
    }
    return { address: record.address, expiresAt: record.expiresAt };
  } catch {
    return null;
  }
}

export function readWalletSession(cookieValue?: string) {
  return readCookie(cookieValue, 'session') as SessionPayload | null;
}

export function readWalletChallenge(cookieValue?: string) {
  return readCookie(cookieValue, 'challenge') as ChallengePayload | null;
}

export function sealWalletSession(value: SessionPayload) { return sealCookie(value, 'session'); }
export function sealWalletChallenge(value: ChallengePayload) { return sealCookie(value, 'challenge'); }
