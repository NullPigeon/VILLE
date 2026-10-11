import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, enforceRate, rpc } from '@/lib/server/database';
import { readPersonalAgent } from '@/lib/server/personal-agents';
import { linkedAgentCredential } from '@/lib/server/linked-agents';
import { yardMarketSuggestion } from '@/lib/server/yard-market';
import { presentJob, publicOffers, readJobOffers, type JobRow } from '@/lib/server/agent-jobs';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    const seller = request.nextUrl.searchParams.get('seller');
    if (seller) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(seller)) throw new ApiError(400, 'Choose a citizen address.');
      const wallet = seller.toLowerCase();
      const [stats, reviews] = await Promise.all([
        rpc<Array<{ completed_count: number; review_count: number; average_rating: number | null }>>('landville_agent_seller_reputation', { p_seller: wallet }),
        database<Array<{ id: string; title: string; rating: number; review: string; completed_at: string }>>(
          `landville_agent_jobs?select=id,title,rating,review,completed_at&seller_wallet=eq.${wallet}&status=eq.completed&rating=not.is.null&order=completed_at.desc&limit=5`),
      ]);
      return NextResponse.json({ completed: Number(stats[0]?.completed_count || 0), reviewed: Number(stats[0]?.review_count || 0),
        average: stats[0]?.average_rating === null ? null : Number(stats[0]?.average_rating || 0), reviews }, { headers: noStore });
    }
    const mine = request.nextUrl.searchParams.get('mine') === '1';
    const owner = mine ? requireWallet(request) : null;
    const rows = await database<JobRow[]>(mine
      ? `landville_agent_jobs?select=*&client_wallet=eq.${owner}&order=created_at.desc&limit=40`
      : 'landville_agent_jobs?select=*&visibility=eq.public&status=neq.cancelled&order=created_at.desc&limit=40');
    const offers = await publicOffers(await readJobOffers(rows.filter((row) => row.visibility === 'public' && row.status === 'open').map((row) => row.id)));
    return NextResponse.json({ jobs: rows.map((row) => presentJob(row, Boolean(owner && owner === row.client_wallet))), offers }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
    const agent = token ? await linkedAgentCredential(token) : null;
    const owner = agent?.ownerWallet || requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['title', 'brief', 'visibility'].includes(key)) ||
      typeof body.title !== 'string' || typeof body.brief !== 'string' ||
      !['private', 'public'].includes(String(body.visibility))) throw new ApiError(400, 'Enter a title, task brief and visibility.');
    const title = body.title.trim();
    const brief = body.brief.trim();
    if (title.length < 4 || title.length > 100 || brief.length < 10 || brief.length > 2000) {
      throw new ApiError(400, 'Use a 4–100 character title and a 10–2000 character brief.');
    }
    if (agent && body.visibility !== 'public') throw new ApiError(403, 'Connected agents may post only public World jobs.');
    if (body.visibility === 'private' && !await readPersonalAgent(owner)) throw new ApiError(404, 'Build your personal agent first.');
    await enforceRate(owner, 'agent-job-create', 4);
    const suggestion = body.visibility === 'private' ? await yardMarketSuggestion(brief) : null;
    const rows = await database<JobRow[]>('landville_agent_jobs', { method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ client_wallet: owner, posted_by_agent: agent?.id || null, visibility: body.visibility, title, brief,
        suggested_service_id: suggestion?.serviceId || null }) });
    return NextResponse.json({ job: presentJob(rows[0], true), suggestion }, { status: 201, headers: noStore });
  } catch (error) { return apiFailure(error); }
}
