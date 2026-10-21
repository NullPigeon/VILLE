import 'server-only';
import { ApiError } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';
import { marketService } from '@/lib/market-services';
import { sellerAmounts, sellerPayoutReady, sellerWallet } from '@/lib/server/market-economy';
import { marketServiceConfigured } from '@/lib/server/market-catalog';
import { marketPaymentsConfigured } from '@/lib/server/market-x402';
import { hasMarketHolderAccess } from '@/lib/server/agent-market';

export type JobRow = {
  id: string; client_wallet: string; posted_by_agent: string | null; visibility: 'private' | 'public'; title: string; brief: string;
  suggested_service_id: string | null; status: 'open' | 'completed' | 'cancelled';
  winning_offer_id: string | null; service_id: string | null; seller_wallet: string | null;
  transaction_hash: string | null; result_output: string | null; paid_micro: number | null;
  rating: number | null; review: string | null; created_at: string; completed_at: string | null;
};
export type OfferRow = { id: string; job_id: string; seller_wallet: string; seller_agent_id: string | null; stall_id: string; created_at: string };
export type StallRow = { id: string; owner_wallet: string; base_service_id: string; title: string;
  description: string; markup_micro: number; status: string };

export function jobId(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, 'Choose a valid job.');
  }
  return value;
}

export async function readJob(id: string) {
  const rows = await database<JobRow[]>(`landville_agent_jobs?select=*&id=eq.${jobId(id)}&limit=1`);
  if (!rows[0]) throw new ApiError(404, 'Job not found.');
  return rows[0];
}

export async function readJobOffers(jobIds: string[]) {
  if (!jobIds.length) return [];
  return database<OfferRow[]>(`landville_agent_job_offers?select=id,job_id,seller_wallet,seller_agent_id,stall_id,created_at&job_id=in.(${jobIds.join(',')})&order=created_at.desc&limit=200`);
}

export async function submitJobOffer(jobIdValue: string, seller: string, stallIdValue: string, sellerAgentId: string | null = null) {
  const job = await readJob(jobIdValue);
  if (job.visibility !== 'public' || job.status !== 'open') throw new ApiError(409, 'This public job is no longer accepting offers.');
  if (job.client_wallet === seller) throw new ApiError(403, 'You cannot offer your own service to yourself.');
  const stallId = jobId(stallIdValue);
  const rows = await database<StallRow[]>(`landville_market_stall_drafts?select=id,owner_wallet,base_service_id,title,description,markup_micro,status&id=eq.${stallId}&owner_wallet=eq.${seller}&status=eq.published&limit=1`);
  const stall = rows[0];
  const base = stall && marketService(stall.base_service_id);
  if (!stall || !base || !marketServiceConfigured(base) || !marketPaymentsConfigured() || !sellerPayoutReady()) {
    throw new ApiError(503, 'This service is not open for paid work.');
  }
  if (base.holderOnly && !await hasMarketHolderAccess(seller)) throw new ApiError(403, 'This model requires 1M SCRAPY.');
  await sellerWallet(seller);
  const path = `landville_agent_job_offers?select=id,job_id,seller_wallet,seller_agent_id,stall_id,created_at&job_id=eq.${job.id}&seller_wallet=eq.${seller}&limit=1`;
  const existing = (await database<OfferRow[]>(path))[0];
  if (existing) {
    if (existing.stall_id !== stallId) throw new ApiError(409, 'You already offered another service for this job.');
    return existing;
  }
  await enforceRate(seller, 'agent-job-offer', 8);
  try {
    const offers = await database<OfferRow[]>('landville_agent_job_offers', { method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ job_id: job.id, seller_wallet: seller, seller_agent_id: sellerAgentId, stall_id: stallId }) });
    return offers[0];
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 409) throw error;
    const retry = (await database<OfferRow[]>(path))[0];
    if (retry?.stall_id === stallId) return retry;
    throw error;
  }
}

export async function publicOffers(offers: OfferRow[]) {
  if (!offers.length || !sellerPayoutReady()) return [];
  const ids = [...new Set(offers.map((offer) => offer.stall_id))];
  const agentIds = [...new Set(offers.map((offer) => offer.seller_agent_id).filter((id): id is string => Boolean(id)))];
  const [stalls, agents] = await Promise.all([
    database<StallRow[]>(`landville_market_stall_drafts?select=id,owner_wallet,base_service_id,title,description,markup_micro,status&id=in.(${ids.join(',')})`),
    agentIds.length ? database<Array<{ id: string; name: string }>>(`landville_linked_agents?select=id,name&id=in.(${agentIds.join(',')})`) : Promise.resolve([]),
  ]);
  return offers.flatMap((offer) => {
    const stall = stalls.find((item) => item.id === offer.stall_id && item.owner_wallet === offer.seller_wallet && item.status === 'published');
    const base = stall && marketService(stall.base_service_id);
    if (!stall || !base || !marketServiceConfigured(base)) return [];
    try {
      return [{ id: offer.id, jobId: offer.job_id, seller: offer.seller_wallet, agentName: agents.find((agent) => agent.id === offer.seller_agent_id)?.name || null, stallId: stall.id,
        serviceTitle: stall.title, description: stall.description,
        priceUsd: sellerAmounts(base.priceUsd, stall.markup_micro).priceUsd,
        createdAt: offer.created_at }];
    } catch { return []; }
  });
}

export function presentJob(row: JobRow, own: boolean) {
  return { id: row.id, client: row.client_wallet, postedByAgent: Boolean(row.posted_by_agent), visibility: row.visibility, title: row.title,
    brief: row.brief, suggestedServiceId: row.suggested_service_id, status: row.status,
    winningOfferId: row.winning_offer_id, serviceId: row.service_id, seller: row.seller_wallet,
    transaction: own ? row.transaction_hash : null, result: own ? row.result_output : null,
    paidMicro: row.paid_micro, rating: row.rating, review: row.review,
    createdAt: row.created_at, completedAt: row.completed_at };
}
