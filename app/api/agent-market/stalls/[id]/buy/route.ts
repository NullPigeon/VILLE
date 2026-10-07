import { NextRequest, NextResponse } from 'next/server';
import { marketService } from '@/lib/market-services';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, rpc } from '@/lib/server/database';
import { linkedAgentCredential } from '@/lib/server/linked-agents';
import { checkAgentMarketBudget, releaseAgentMarketSpend, reserveAgentMarketSpend, settleAgentMarketSpend } from '@/lib/server/market-agent-budget';
import { marketServiceConfigured } from '@/lib/server/market-catalog';
import { sellerAmounts, sellerPayoutReady, sellerWallet } from '@/lib/server/market-economy';
import { claimMarketOrder, finishMarketOrder, marketHash, marketOrder, marketOrderStorageReady } from '@/lib/server/market-orders';
import { getStallPaymentServer, marketPaymentsConfigured } from '@/lib/server/market-x402';
import { performMarketWork, validateMarketPrompt } from '@/lib/server/market-work';
import { hasMarketHolderAccess } from '@/lib/server/agent-market';

export const runtime = 'nodejs';
export const maxDuration = 90;
const noStore = { 'Cache-Control': 'private, no-store' };
type Stall = { id: string; owner_wallet: string; base_service_id: string; title: string; description: string;
  instructions: string; status: string; markup_micro: number; updated_at: string };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(404, 'Citizen service not found.');
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
    const agent = token ? await linkedAgentCredential(token) : null;
    const buyer = agent?.ownerWallet || requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).length !== 1 || typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 2000) {
      throw new ApiError(400, 'Describe one job in 1–2000 characters.');
    }
    if (!marketPaymentsConfigured() || !sellerPayoutReady() || !await marketOrderStorageReady()) {
      throw new ApiError(503, 'Citizen sales and payouts are not ready yet.');
    }
    const prompt = body.prompt.trim();
    const signature = request.headers.get('payment-signature');
    const hash = signature ? marketHash(signature) : null;
    const promptHash = marketHash(JSON.stringify([id, prompt]));
    if (hash) {
      const existing = await marketOrder(hash);
      if (existing) {
        if (existing.service_id !== `stall:${id}` || existing.prompt_hash !== promptHash) throw new ApiError(409, 'Payment authorization belongs to another job.');
        if (existing.status === 'settled' && existing.output && existing.transaction_hash) {
          return NextResponse.json({ service: `stall:${id}`, output: existing.output,
            payment: { transaction: existing.transaction_hash, network: 'eip155:4663', payer: existing.payer }, replayed: true }, { headers: noStore });
        }
        throw new ApiError(409, 'This payment is processing or needs review. Check your wallet.');
      }
    }
    const rows = await database<Stall[]>(`landville_market_stall_drafts?select=id,owner_wallet,base_service_id,title,description,instructions,status,markup_micro,updated_at&id=eq.${id}&status=eq.published&limit=1`);
    const stall = rows[0];
    if (!stall) throw new ApiError(404, 'Citizen service is no longer published.');
    if (stall.owner_wallet === buyer) throw new ApiError(403, 'Choose another citizen’s service.');
    const base = marketService(stall.base_service_id);
    if (!base || !['model', 'long-form', 'research-brief'].includes(base.kind) || !marketServiceConfigured(base)) throw new ApiError(503, 'This service foundation is not available.');
    if (base.holderOnly && !await hasMarketHolderAccess(stall.owner_wallet)) throw new ApiError(503, 'The seller no longer has access to this premium model.');
    await sellerWallet(stall.owner_wallet);
    const price = sellerAmounts(base.priceUsd, stall.markup_micro);
    validateMarketPrompt(base, prompt);
    if (agent) await checkAgentMarketBudget(agent, 'citizens', price.gross);
    const server = await getStallPaymentServer(stall.id, stall.updated_at, stall.description, price.priceUsd);
    const context = { adapter: {
      getHeader: (name: string) => request.headers.get(name) ?? undefined,
      getMethod: () => request.method, getPath: () => request.nextUrl.pathname,
      getUrl: () => request.url, getAcceptHeader: () => request.headers.get('accept') || 'application/json',
      getUserAgent: () => request.headers.get('user-agent') || '',
    }, path: request.nextUrl.pathname, method: request.method, paymentHeader: signature ?? undefined };
    const payment = await server.processHTTPRequest(context);
    if (payment.type === 'payment-error') return NextResponse.json(payment.response.body ?? { error: 'Payment required.' },
      { status: payment.response.status, headers: { ...payment.response.headers, ...noStore } });
    if (payment.type !== 'payment-verified' || !hash) throw new ApiError(503, 'Citizen payment could not be verified.');
    try { await reserveAgentMarketSpend(agent, 'citizens', price.gross, hash); }
    catch (error) { await payment.cancellationDispatcher.cancel({ reason: 'handler_failed' }).catch(() => undefined); throw error; }
    let claimed: boolean;
    try { claimed = await claimMarketOrder(hash, `stall:${id}`, promptHash); }
    catch (error) {
      await releaseAgentMarketSpend(agent, hash).catch(() => undefined);
      await payment.cancellationDispatcher.cancel({ reason: 'handler_failed' }).catch(() => undefined);
      throw error;
    }
    if (!claimed) {
      await releaseAgentMarketSpend(agent, hash).catch(() => undefined);
      await payment.cancellationDispatcher.cancel({ reason: 'handler_failed' }).catch(() => undefined);
      throw new ApiError(409, 'This payment is already processing.');
    }
    let output: string;
    try {
      const recipePrompt = base.kind === 'research-brief' ? prompt : `Citizen service: ${stall.title}\nRecipe: ${stall.instructions}\n\nCustomer job: ${prompt}`;
      output = await performMarketWork(base, recipePrompt, hash,
        base.kind === 'research-brief' ? stall.instructions : undefined);
    } catch (error) {
      await payment.cancellationDispatcher.cancel({ reason: 'handler_failed' }).catch(() => undefined);
      await releaseAgentMarketSpend(agent, hash).catch(() => undefined);
      await finishMarketOrder(hash, 'failed').catch(() => undefined);
      throw error;
    }
    let settled;
    try {
      settled = await server.processSettlement(payment.paymentPayload, payment.paymentRequirements,
        payment.declaredExtensions, { request: context, responseHeaders: {} }, undefined, payment.beforeHandlerSettlement);
    } catch {
      await finishMarketOrder(hash, 'settlement_unknown').catch(() => undefined);
      throw new ApiError(503, 'Settlement status is unknown. Check your wallet before paying again.');
    }
    if (!settled.success) {
      await finishMarketOrder(hash, 'settlement_unknown').catch(() => undefined);
      throw new ApiError(503, 'Settlement was not confirmed. Check your wallet before paying again.');
    }
    await settleAgentMarketSpend(agent, hash, settled.transaction).catch(() => undefined);
    try {
      await rpc('landville_settle_market_sale', { p_hash: hash, p_stall: id, p_seller: stall.owner_wallet,
        p_buyer: buyer, p_base: Number(price.base), p_gross: Number(price.gross), p_output: output.slice(0, 18_000),
        p_transaction: settled.transaction.toLowerCase(), p_payer: settled.payer || '' });
    } catch {
      await finishMarketOrder(hash, 'settlement_unknown', { output: output.slice(0, 18_000),
        transaction: settled.transaction.toLowerCase(), payer: settled.payer || '' }).catch(() => undefined);
      throw new ApiError(503, `Payment settled but the sale ledger needs review. Transaction: ${settled.transaction}`);
    }
    return NextResponse.json({ service: `stall:${id}`, output, payment: { transaction: settled.transaction,
      network: settled.network, payer: settled.payer }, seller: stall.owner_wallet },
    { headers: { ...settled.headers, ...noStore } });
  } catch (error) { return apiFailure(error); }
}
