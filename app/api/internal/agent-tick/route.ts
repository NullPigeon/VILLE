import { NextRequest, NextResponse } from 'next/server';
import type { TownMessage } from '@/lib/chat-data';
import type { AgentRow } from '@/lib/server/personal-agents';
import { ApiError, apiFailure } from '@/lib/server/api';
import { requireWorker } from '@/lib/server/builds';
import { readMessages } from '@/lib/server/chat';
import { database, rpc } from '@/lib/server/database';
import { generateTownAgentPost } from '@/lib/server/personal-agent-ai';
import { agentRecord } from '@/lib/server/personal-agents';

export const runtime = 'nodejs';
export const maxDuration = 60;

type AgentPostRow = { created_at: string };

export async function POST(request: NextRequest) {
  try {
    requireWorker(request);
    if (process.env.LANDVILLE_AGENT_AUTONOMY_ENABLED !== 'true') {
      return NextResponse.json({ posted: false, reason: 'disabled' }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const claim = await rpc<AgentRow | null>('landville_claim_agent_post', {});
    if (!claim || !claim.lease_id) {
      return NextResponse.json({ posted: false, reason: 'no_due_agent' }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const agent = agentRecord(claim);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const previous = await database<AgentPostRow[]>(
        `landville_messages?select=created_at&kind=eq.AGENT&agent_owner_wallet=eq.${agent.ownerWallet}&created_at=gte.${today}T00:00:00Z&order=created_at.desc&limit=4`,
      );
      if (previous.length >= 4) {
        await rpc('landville_defer_agent_post', { p_owner: agent.ownerWallet, p_lease: claim.lease_id });
        return NextResponse.json({ posted: false, reason: 'daily_cap' }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const { messages } = await readMessages('TOWN');
      const lastPost = previous[0]?.created_at || '';
      const target: TownMessage | undefined = [...messages].reverse().find((message) =>
        message.kind === 'CITIZEN' && message.wallet !== agent.ownerWallet
        && Date.parse(message.createdAt) > Date.now() - 4 * 60 * 60 * 1000
        && (!lastPost || Date.parse(message.createdAt) > Date.parse(lastPost)),
      );
      if (agent.townMode === 'REPLY' && !target) {
        await rpc('landville_defer_agent_post', { p_owner: agent.ownerWallet, p_lease: claim.lease_id });
        return NextResponse.json({ posted: false, reason: 'no_new_citizen_message' }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const replyTo = agent.townMode === 'BANTER' ? null : target?.id || null;
      const text = await generateTownAgentPost(agent, messages, replyTo ? target : undefined);
      if (!text.trim() || text.length > 600) throw new ApiError(503, 'Agent reply was invalid.');
      const posted = await rpc<{ id: string } | null>('landville_finish_agent_post', {
        p_owner: agent.ownerWallet, p_lease: claim.lease_id, p_body: text,
        p_reply_to: replyTo,
      });
      return NextResponse.json({ posted: Boolean(posted), reason: posted ? 'posted' : 'daily_cap' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      await rpc('landville_defer_agent_post', { p_owner: agent.ownerWallet, p_lease: claim.lease_id }).catch(() => undefined);
      throw error;
    }
  } catch (error) { return apiFailure(error); }
}
