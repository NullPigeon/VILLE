import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { validateAgentCapabilities } from '@/lib/linked-agents';
import { ApiError, apiFailure, jsonBody } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';
import { linkedAgentRecord, type LinkedAgentRow } from '@/lib/server/linked-agents';

export const runtime = 'nodejs';

// A connected agent proves possession of its one-time profile token. This grants
// heartbeat only: no wallet, chat, listing, payment or spending permission.
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
    if (!/^lvag_[0-9a-f]{64}$/.test(token)) throw new ApiError(401, 'Invalid agent connection token.');
    const hash = createHash('sha256').update(token).digest('hex');
    await enforceRate(hash, 'linked-agent-heartbeat', 30);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => key !== 'capabilities')) throw new ApiError(400, 'Unsupported connection setting.');
    let capabilities;
    try { capabilities = body.capabilities === undefined ? undefined : validateAgentCapabilities(body.capabilities); }
    catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'Invalid capabilities.'); }
    const rows = await database<LinkedAgentRow[]>(
      `landville_linked_agents?token_hash=eq.${hash}&select=id,owner_wallet,name,description,capabilities,last_seen_at,created_at&limit=1`,
    );
    if (!rows.length) throw new ApiError(401, 'Agent connection was revoked or is invalid.');
    const updated = await database<LinkedAgentRow[]>(
      `landville_linked_agents?id=eq.${rows[0].id}&token_hash=eq.${hash}&select=id,owner_wallet,name,description,capabilities,last_seen_at,created_at`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ last_seen_at: new Date().toISOString(), ...(capabilities ? { capabilities } : {}) }) },
    );
    if (!updated.length) throw new ApiError(401, 'Agent connection was revoked.');
    return NextResponse.json({ connected: true, agent: linkedAgentRecord(updated[0]) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
