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

function signature(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function sealCookie(value: ChallengePayload | SessionPayload) {
  const payload = encode(value);
  return `${payload}.${signature(payload)}`;
}

export function readCookie<T extends ChallengePayload | SessionPayload>(value?: string): T | null {
  if (!value) return null;
  const [payload, suppliedSignature] = value.split('.');
  if (!payload || !suppliedSignature) return null;

  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
    return decoded.expiresAt > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}

export function readWalletSession(cookieValue?: string) {
  return readCookie<SessionPayload>(cookieValue);
}
