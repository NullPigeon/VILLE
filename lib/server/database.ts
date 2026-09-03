import 'server-only';
import { ApiError } from '@/lib/server/api';

export function databaseConfigured() {
  return Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

const databaseErrors: Record<string, [number, string]> = {
  HOLD_CHECK_REQUIRED: [409, 'Messages beyond the first 10 require verified SCRAPY holdings.'],
  ACCOUNT_REQUIRED: [401, 'Create your citizen account by signing in with your wallet.'],
  ACTIVE_PROPOSAL_EXISTS: [409, 'You already have an active proposal. Submit another after it is built or rejected.'],
  BUILD_ALREADY_RUNNING: [409, 'Another build is running. Finish or reject it before starting the next.'],
  BUILD_QUEUE_ORDER: [409, 'An earlier approved proposal is waiting. Finalize and build proposals in voting-deadline order.'],
  DAILY_MESSAGE_LIMIT: [429, 'Daily message limit reached: 10 without SCRAPY, 50 with SCRAPY, across both chats. Resets at 00:00 UTC.'],
  INVALID_SNAPSHOT: [409, 'The balance snapshot expired or is invalid. Please retry.'],
  BUILD_HOLD_REQUIRED: [403, 'You need at least 250,000 SCRAPY to request a build.'],
  ALREADY_VOTED: [409, 'This wallet has already voted on this proposal.'],
  VOTING_CLOSED: [409, 'Voting has closed.'],
  TOKEN_CHANGED: [409, 'The configured SCRAPY contract differs from this proposal.'],
  PROPOSAL_NOT_FOUND: [404, 'Proposal not found.'],
  STALE_STATUS: [409, 'The proposal changed. Refresh before trying again.'],
  VOTING_STILL_OPEN: [409, 'The voting deadline has not passed.'],
  INVALID_TRANSITION: [409, 'That build action is not allowed from the current status.'],
  RELEASE_REQUIRED: [400, 'A deployed module path and release reference are required.'],
  IDEMPOTENCY_CONFLICT: [409, 'This submission ID already belongs to different content.'],
  INVALID_VOTING_RULES: [503, 'Voting rules are not configured.'],
};

// Server-only HTTP adapter; existing wallet authentication stays independent of Supabase Auth.
export async function database<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(503, 'Shared storage is not connected. Configure the LANDVILLE Supabase project.');
  const headers = new Headers(init.headers);
  headers.set('apikey', key);
  // New sb_secret_ keys are not JWTs. Only legacy service_role uses Bearer.
  if (!key.startsWith('sb_secret_')) headers.set('Authorization', `Bearer ${key}`);
  headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, { ...init, headers, cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  } catch { throw new ApiError(503, 'Shared storage is temporarily unavailable. Nothing was saved locally.'); }
  if (!response.ok) {
    const failure = await response.json().catch(() => ({})) as { message?: string; code?: string };
    const known = failure.message ? databaseErrors[failure.message] : undefined;
    if (known) { const error = new ApiError(...known); error.code = failure.message; throw error; }
    if (failure.code === '23505') throw new ApiError(409, 'This record already exists. Refresh and retry.');
    if (['23514', '23502', '22P02'].includes(failure.code || '')) throw new ApiError(400, 'Invalid record values.');
    // Do not echo SQL, provider responses, or credentials to clients/logs.
    throw new ApiError(503, 'Shared storage is unavailable or its migrations are missing.');
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function rpc<T>(name: string, body: Record<string, unknown>) {
  return database<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
}

export async function enforceRate(wallet: string, action: string, limit: number) {
  const allowed = await rpc<boolean>('landville_rate_limit', { p_key: `${action}:${wallet}`, p_limit: limit });
  if (!allowed) throw new ApiError(429, 'Too many requests. Wait a minute and try again.');
}

export async function registerCitizen(wallet: string) {
  await database('landville_citizens?on_conflict=wallet', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ wallet }),
  });
}

export async function assertCitizen(wallet: string) {
  const records = await database<Array<{ wallet: string }>>(`landville_citizens?select=wallet&wallet=eq.${wallet}&limit=1`);
  if (!records.length) throw new ApiError(401, 'Create your citizen account by signing in with your wallet.');
}
