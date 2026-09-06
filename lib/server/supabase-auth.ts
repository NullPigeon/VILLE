import 'server-only';

import { ApiError } from '@/lib/server/api';

function configuration() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(503, 'Email sign-in is not configured.');
  return { url: url.replace(/\/$/, ''), key };
}

async function authRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { url, key } = configuration();
  const headers = new Headers({ apikey: key, 'Content-Type': 'application/json' });
  if (!key.startsWith('sb_secret_')) headers.set('Authorization', `Bearer ${key}`);
  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1/${path}`, {
      method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new ApiError(503, 'Email sign-in is temporarily unavailable. Try again.');
  }
  if (!response.ok) {
    if (response.status === 429) throw new ApiError(429, 'Too many email-code requests. Wait and try again.');
    if (path === 'verify') throw new ApiError(401, 'That email code is invalid or expired.');
    throw new ApiError(503, 'The sign-in email could not be sent. Check the address and try again.');
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export function normalizeEmail(value: unknown) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new ApiError(400, 'Enter a valid email address.');
  }
  return email;
}

export async function sendEmailOtp(email: string) {
  await authRequest('otp', { email, create_user: true });
}

export async function verifyEmailOtp(email: string, token: string) {
  if (!/^\d{6}$/.test(token)) throw new ApiError(400, 'Enter the 6-digit code from your email.');
  const result = await authRequest<{ user?: { id?: string; email?: string } }>('verify', { email, token, type: 'email' });
  const id = result.user?.id;
  const verifiedEmail = result.user?.email?.toLowerCase();
  if (!id || verifiedEmail !== email) throw new ApiError(401, 'That email code is invalid or expired.');
  return { id, email: verifiedEmail };
}
