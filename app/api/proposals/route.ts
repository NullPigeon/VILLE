import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate, rpc } from '@/lib/server/database';
import { proposalRecord, type ProposalRow } from '@/lib/server/records';
import { oneOf, requestId } from '@/lib/server/validation';
import { readVotingSnapshot } from '@/lib/server/voting';
import { scrapyProposalDraft } from '@/lib/proposal-draft';

type ProposalSourceRow = { id: string; body: string; request_id: string | null };

async function proposalSource(body: Record<string, unknown>, wallet: string) {
  const sourceReplyId = body.sourceReplyId;
  if (typeof sourceReplyId !== 'string' || sourceReplyId.length < 50 || sourceReplyId.length > 120) throw new ApiError(400, 'Open proposals from Scrapy’s REVIEW & PROPOSE button in Town Chat.');
  const match = sourceReplyId.match(/^reply-(citizen-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}))$/i);
  if (!match) throw new ApiError(400, 'Open proposals from Scrapy’s REVIEW & PROPOSE button in Town Chat.');
  const [replies, requests] = await Promise.all([
    database<ProposalSourceRow[]>(`landville_messages?select=id,body,request_id&id=eq.${sourceReplyId}&kind=eq.MAYOR&channel=eq.TOWN&ai_source=eq.openai&limit=1`),
    database<ProposalSourceRow[]>(`landville_messages?select=id,body,request_id&id=eq.${match[1]}&wallet=eq.${wallet}&kind=eq.CITIZEN&channel=eq.TOWN&ask_scrapy=eq.true&limit=1`),
  ]);
  const reply = replies[0];
  const citizen = requests[0];
  if (!reply || !citizen || citizen.request_id?.toLowerCase() !== match[2].toLowerCase()) throw new ApiError(400, 'Open proposals from your own public conversation with Scrapy.');
  const draft = scrapyProposalDraft(citizen.body, reply.body);
  if (!draft) throw new ApiError(409, 'Keep discussing the idea with Scrapy until REVIEW & PROPOSE appears.');
  return { ...draft, requestId: requestId(citizen.request_id) };
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    const body = await jsonBody(request);
    const source = await proposalSource(body, wallet);
    const id = source.requestId;
    const title = source.title;
    const summary = source.summary;
    const category = oneOf(body.category, ['UTILITY','GAME','ART','MEME','TOKEN','OTHER']);
    const district = oneOf(body.district, ['THE DUMP','TOKEN ALLEY','MARKET','MEME PIT','TOWNWIDE']);
    // An uncertain HTTP result can be retried without creating a second proposal.
    const existing = await database<ProposalRow[]>(`landville_proposals?creator_wallet=eq.${wallet}&request_id=eq.${id}&limit=1`);
    await enforceRate(wallet, 'proposal', 8);
    if (!existing.length) {
      const active = await database<Array<{ id: string }>>(`landville_proposals?select=id&creator_wallet=eq.${wallet}&status=in.(LIVE,PASSED,BUILDING)&order=created_at.asc&limit=2`);
      if (active.length >= 2) throw new ApiError(409, `Your proposals ${active.map((item) => item.id).join(' and ')} are still active. At least one must be built or rejected before submitting another.`);
    }
    // The RPC repeats this check under a wallet lock; the read above only saves an RPC balance request.
    const snapshot = existing[0]?.eligibility_snapshot || await readVotingSnapshot(wallet);
    const row = await rpc<ProposalRow>('landville_create_proposal', {
      p_wallet: wallet, p_request_id: id, p_title: title, p_summary: summary, p_category: category, p_district: district,
      p_snapshot: snapshot,
    });
    return NextResponse.json({ proposal: proposalRecord(row) });
  } catch (error) { return apiFailure(error); }
}
