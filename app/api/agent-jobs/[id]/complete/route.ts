import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import { marketService } from '@/lib/market-services';
import { externalMarketService } from '@/lib/external-market';
import { receiptMatchesJob } from '@/lib/agent-job-receipt';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { citizenAccount, database, rpc } from '@/lib/server/database';
import { jobId, readJob, type OfferRow } from '@/lib/server/agent-jobs';

export const runtime = 'nodejs';
type Order = { service_id: string; prompt_hash: string; model_id: string | null; status: string; output: string | null;
  transaction_hash: string; payer: string | null };
type Sale = { stall_id: string; seller_wallet: string; buyer_wallet: string; gross_micro: number; transaction_hash: string };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const job = await readJob(jobId((await params).id));
    if (job.client_wallet !== owner || job.status !== 'open') throw new ApiError(409, 'This job is not open for your account.');
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['transaction', 'offerId'].includes(key)) ||
      typeof body.transaction !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(body.transaction) ||
      (job.visibility === 'public' && typeof body.offerId !== 'string') ||
      (job.visibility === 'private' && body.offerId !== undefined)) throw new ApiError(400, 'Choose a completed Market receipt for this job.');
    const transaction = body.transaction.toLowerCase();
    const citizen = await citizenAccount(owner);
    const payer = citizen?.linked_wallet?.toLowerCase();
    if (!payer) throw new ApiError(403, 'Link the wallet that made this purchase.');
    const orders = await database<Order[]>(`landville_market_orders?select=service_id,prompt_hash,model_id,status,output,transaction_hash,payer&transaction_hash=ilike.${transaction}&status=eq.settled&limit=1`);
    const order = orders[0];
    if (!order?.output || order.payer?.toLowerCase() !== payer) throw new ApiError(404, 'A settled receipt from your linked wallet was not found.');
    let offerId: string | null = null;
    let seller: string | null = null;
    let paid: number | null = null;
    let expectedService: string;
    if (job.visibility === 'public') {
      offerId = jobId(body.offerId);
      const offers = await database<OfferRow[]>(`landville_agent_job_offers?select=id,job_id,seller_wallet,stall_id,created_at&id=eq.${offerId}&job_id=eq.${job.id}&limit=1`);
      const offer = offers[0];
      if (!offer) throw new ApiError(404, 'Offer not found for this job.');
      expectedService = `stall:${offer.stall_id}`;
      const sales = await database<Sale[]>(`landville_market_sales?select=stall_id,seller_wallet,buyer_wallet,gross_micro,transaction_hash&transaction_hash=ilike.${transaction}&limit=1`);
      const sale = sales[0];
      if (!sale || sale.stall_id !== offer.stall_id || sale.seller_wallet !== offer.seller_wallet || sale.buyer_wallet !== owner) {
        throw new ApiError(409, 'This purchase does not belong to the selected citizen offer.');
      }
      seller = offer.seller_wallet;
      paid = sale.gross_micro;
    } else {
      const suggested = job.suggested_service_id;
      if (!suggested) throw new ApiError(409, 'This task has no matched Market service yet.');
      const direct = externalMarketService(suggested);
      const city = marketService(suggested);
      if (direct) {
        if ((direct.modelPicker && !order.model_id) || (direct.fixedModelId && direct.fixedModelId !== order.model_id)) {
          throw new ApiError(409, 'The paid model selection does not match this task.');
        }
        expectedService = `external:${direct.id}`;
      } else if (city) {
        expectedService = city.id;
        paid = Number(parseUnits(city.priceUsd, 6));
      } else throw new ApiError(409, 'The suggested Market service is no longer available.');
    }
    if (!receiptMatchesJob(order, expectedService, job.brief, order.model_id)) {
      throw new ApiError(409, 'The receipt was for a different service or task brief.');
    }
    const finished = await rpc<boolean>('landville_finish_agent_job', {
      p_id: job.id, p_client: owner, p_offer: offerId, p_service: expectedService,
      p_seller: seller, p_transaction: transaction, p_output: order.output, p_paid: paid,
    });
    if (!finished) throw new ApiError(409, 'Job changed while the receipt was being attached. Refresh the board.');
    return NextResponse.json({ completed: true, transaction }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
