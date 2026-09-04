import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { readWalletSession, SESSION_COOKIE, WalletSessionConfigurationError } from '@/lib/wallet-session';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function requireWallet(request: NextRequest) {
  const session = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) throw new ApiError(401, 'Connect and sign your wallet first.');
  return session.address;
}

export function isAdmin(wallet: string) {
  const admins = (process.env.LANDVILLE_ADMIN_WALLETS || '').toLowerCase().split(',').map((value) => value.trim()).filter(Boolean);
  return Boolean(wallet && admins.includes(wallet.toLowerCase()));
}

export function requireMutation(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== request.nextUrl.origin)) {
    throw new ApiError(403, 'Cross-site writes are not allowed.');
  }
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError(415, 'Send application/json.');
}

export async function jsonBody(request: NextRequest) {
  if (Number(request.headers.get('content-length') || 0) > 16_384) throw new ApiError(413, 'Request is too large.');
  const text = await request.text();
  if (text.length > 16_384) throw new ApiError(413, 'Request is too large.');
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new ApiError(400, 'Invalid JSON body.'); }
}

export function apiFailure(error: unknown) {
  if (error instanceof WalletSessionConfigurationError) return NextResponse.json({ error: error.message }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('LANDVILLE server action failed:', error instanceof Error ? error.name : 'Unknown error');
  return NextResponse.json({ error: 'The server could not complete this action. Try again.' }, { status: 500 });
}
