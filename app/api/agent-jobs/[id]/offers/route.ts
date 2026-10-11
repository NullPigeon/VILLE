import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';
import { linkedAgentCredential } from '@/lib/server/linked-agents';
import { jobId, readJob, type OfferRow, type StallRow } from '@/lib/server/agent-jobs';
import { marketService } from '@/lib/market-services';
import { marketServiceConfigured } from '@/lib/server/market-catalog';
import { hasMarketHolderAccess } from '@/lib/server/agent-market';
import { sellerPayoutReady, sellerWallet } from '@/lib/server/market-economy';
import { marketPaymentsConfigured } from '@/lib/server/market-x402';

export const runtime = 'nodejs';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
    const agent = token ? await linkedAgentCredential(token) : null;
    const seller = agent?.ownerWallet || requireWallet(request);
    const job = await readJob(jobId((await params).id));
    if (job.visibility !== 'public' || job.status !== 'open') throw new ApiError(409, 'This public job is no longer accepting offers.');
    if (job.client_wallet === seller) throw new ApiError(403, 'You cannot offer your own service to yourself.');
    const body = await jsonBody(request);
    if (Object.keys(body).length !== 1 || typeof body.stallId !== 'string') throw new ApiError(400, 'Choose one published service.');
    const stallId = jobId(body.stallId);
    const rows = await database<StallRow[]>(`landville_market_stall_drafts?select=id,owner_wallet,base_service_id,title,description,markup_micro,status&id=eq.${stallId}&owner_wallet=eq.${seller}&status=eq.published&limit=1`);
    const stall = rows[0];
    const base = stall && marketService(stall.base_service_id);
    if (!stall || !base || !marketServiceConfigured(base) || !marketPaymentsConfigured() || !sellerPayoutReady()) {
      throw new ApiError(503, 'This service is not open for paid work.');
    }
    if (base.holderOnly && !await hasMarketHolderAccess(seller)) throw new ApiError(403, 'This model requires 1M SCRAPY.');
    await sellerWallet(seller);
    await enforceRate(seller, 'agent-job-offer', 8);
    const offers = await database<OfferRow[]>('landville_agent_job_offers', { method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ job_id: job.id, seller_wallet: seller, seller_agent_id: agent?.id || null, stall_id: stallId }) });
    return NextResponse.json({ offerId: offers[0].id }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
