import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, ApiError, isAdmin, requireMutation, requireWallet } from '@/lib/server/api';
import { database, databaseConfigured, enforceRate } from '@/lib/server/database';
import { mayorConfiguration, requestMayorReply } from '@/lib/server/mayor-ai';
import { walletSessionConfigured } from '@/lib/wallet-session';

export const runtime = 'nodejs';
export const maxDuration = 60;
function admin(request: NextRequest) {
  const wallet = requireWallet(request);
  if (!isAdmin(wallet)) throw new ApiError(403, 'Administrator access required.');
  return wallet;
}
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    admin(request);
    let storage = 'not configured';
    if (databaseConfigured()) {
      try {
        await Promise.all([
          database('landville_messages?select=id,ai_source,ask_scrapy&limit=0'),
          database('landville_citizens?select=wallet,citizen_number,username,bio,avatar&limit=0'),
          database('landville_proposals?select=id&limit=0'),
          database('landville_build_jobs?select=proposal_id&limit=0'),
        ]);
        storage = 'reachable; chat provenance and citizen profile columns available';
      } catch { storage = 'unavailable: check credentials and migrations 001–007'; }
    }
    return NextResponse.json({ storage, sessionConfigured: walletSessionConfigured(), ai: { ...mayorConfiguration(), verified: false },
      builderEnabled: process.env.LANDVILLE_BUILDER_ENABLED === 'true',
      builderConfigurationPresent: Boolean((process.env.LANDVILLE_WORKER_SECRET?.length || 0) >= 32 &&
        process.env.LANDVILLE_BUILD_ACTOR && isAdmin(process.env.LANDVILLE_BUILD_ACTOR) &&
        process.env.LANDVILLE_GITHUB_READ_TOKEN && process.env.LANDVILLE_VERCEL_READ_TOKEN && process.env.LANDVILLE_VERCEL_PROJECT_ID),
    }, { headers });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = admin(request);
    await enforceRate(wallet, 'ai-readiness', 1);
    const result = await requestMayorReply([{ id: 'readiness', kind: 'CITIZEN', wallet, author: 'Operator', body: 'Reply with one short sentence confirming you can answer. This is a connectivity test, not a town message.', createdAt: new Date().toISOString() }], wallet);
    return NextResponse.json({ ok: result.ok, message: result.ok ? 'Live AI response received. Nothing was posted to Town Chat.' : result.reason, checkedAt: new Date().toISOString() }, { headers });
  } catch (error) { return apiFailure(error); }
}
