import { NextRequest, NextResponse } from 'next/server';
import { marketService } from '@/lib/market-services';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { getMarketPaymentServer, marketPaymentsConfigured } from '@/lib/server/market-x402';
import { claimMarketOrder, finishMarketOrder, marketHash, marketOrder, marketOrderStorageReady } from '@/lib/server/market-orders';
import { performMarketWork, validateMarketPrompt } from '@/lib/server/market-work';
import { marketServiceConfigured } from '@/lib/server/market-catalog';
import { hasMarketHolderAccess } from '@/lib/server/agent-market';
import { readOwnedMarketDraft } from '@/lib/server/market-stalls';
import { linkedAgentOwner } from '@/lib/server/linked-agents';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const { service: id } = await params;
  const service = marketService(id);
  if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  if (!marketPaymentsConfigured()) return NextResponse.json({ error: 'City payments are not open yet.' }, { status: 503 });
  try {
    requireMutation(request);
    if (!marketServiceConfigured(service)) throw new ApiError(503, 'This service is not open yet.');
    if (service.holderOnly) {
      const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
      const owner = token ? await linkedAgentOwner(token) : requireWallet(request);
      if (!await hasMarketHolderAccess(owner)) throw new ApiError(403, 'Hold SCRAPY in your linked wallet to use this model.');
    }
    const body = await jsonBody(request);
    const recipeTest = body.draftId !== undefined || body.draftRevision !== undefined;
    if (Object.keys(body).some((key) => !['prompt', 'draftId', 'draftRevision'].includes(key))
      || typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > (recipeTest ? 600 : 2000)
      || (recipeTest && (Object.keys(body).length !== 3 || typeof body.draftId !== 'string' || typeof body.draftRevision !== 'string'))
      || (!recipeTest && Object.keys(body).length !== 1)) {
      throw new ApiError(400, 'Send a prompt of 1–2000 characters.');
    }
    if (!await marketOrderStorageReady()) throw new ApiError(503, 'Market order storage is not ready.');
    const prompt = body.prompt.trim();
    validateMarketPrompt(service, prompt);
    const draft = recipeTest ? await readOwnedMarketDraft(requireWallet(request), body.draftId as string, body.draftRevision as string) : null;
    if (draft && (draft.base_service_id !== service.id || !['model', 'long-form', 'research-brief'].includes(service.kind))) {
      throw new ApiError(400, 'This recipe belongs to another service.');
    }
    const signature = request.headers.get('payment-signature');
    const authorizationHash = signature ? marketHash(signature) : null;
    const promptHash = marketHash(draft ? JSON.stringify({ prompt, draftId: draft.id, draftRevision: draft.updated_at }) : prompt);
    if (authorizationHash) {
      const existing = await marketOrder(authorizationHash);
      if (existing) {
        if (existing.service_id !== service.id || existing.prompt_hash !== promptHash) throw new ApiError(409, 'This payment authorization belongs to another request.');
        if (existing.status === 'settled' && existing.output && existing.transaction_hash) {
          return NextResponse.json({ service: service.id, output: existing.output,
            payment: { transaction: existing.transaction_hash, network: 'eip155:4663', payer: existing.payer }, replayed: true },
          { headers: { 'Cache-Control': 'private, no-store' } });
        }
        throw new ApiError(409, 'This payment is already being processed or needs review. Check your wallet before retrying.');
      }
    }
    const server = await getMarketPaymentServer();
    const context = {
      adapter: {
        getHeader: (name: string) => request.headers.get(name) ?? undefined,
        getMethod: () => request.method,
        getPath: () => request.nextUrl.pathname,
        getUrl: () => request.url,
        getAcceptHeader: () => request.headers.get('accept') || 'application/json',
        getUserAgent: () => request.headers.get('user-agent') || '',
      },
      path: request.nextUrl.pathname, method: request.method,
      paymentHeader: signature ?? undefined,
    };
    const payment = await server.processHTTPRequest(context);
    if (payment.type === 'payment-error') {
      return NextResponse.json(payment.response.body ?? { error: 'Payment required.' },
        { status: payment.response.status, headers: { ...payment.response.headers, 'Cache-Control': 'private, no-store' } });
    }
    if (payment.type !== 'payment-verified') throw new Error('MARKET_PAYMENT_NOT_REQUIRED');
    if (!authorizationHash) throw new Error('MARKET_PAYMENT_SIGNATURE_MISSING');
    const claimed = await claimMarketOrder(authorizationHash, service.id, promptHash);
    if (!claimed) {
      await payment.cancellationDispatcher.cancel({ reason: 'handler_failed' }).catch(() => undefined);
      throw new ApiError(409, 'This payment is already being processed. Check your wallet before retrying.');
    }
    let output: string;
    try {
      const recipePrompt = draft && service.kind !== 'research-brief'
        ? `Private service recipe: ${draft.instructions}\n\nOwner's test job: ${prompt}` : prompt;
      output = await performMarketWork(service, recipePrompt, authorizationHash,
        draft?.base_service_id === 'research-brief' ? draft.instructions : undefined);
      if (draft) output = `PRIVATE RECIPE TEST: ${draft.title}\n\n${output}`;
    } catch (error) {
      await payment.cancellationDispatcher.cancel({ reason: 'handler_failed' }).catch(() => undefined);
      await finishMarketOrder(authorizationHash, 'failed').catch(() => undefined);
      throw error;
    }
    let settled;
    try {
      settled = await server.processSettlement(payment.paymentPayload, payment.paymentRequirements,
        payment.declaredExtensions, { request: context, responseHeaders: {} }, undefined, payment.beforeHandlerSettlement);
    } catch {
      await finishMarketOrder(authorizationHash, 'settlement_unknown').catch(() => undefined);
      throw new ApiError(503, 'Settlement status is unknown. Check your wallet before making another payment.');
    }
    if (!settled.success) {
      await finishMarketOrder(authorizationHash, 'settlement_unknown').catch(() => undefined);
      return NextResponse.json({ error: 'Settlement could not be confirmed. Check your wallet before making another payment.' },
        { status: settled.response.status, headers: { ...settled.response.headers, 'Cache-Control': 'private, no-store' } });
    }
    await finishMarketOrder(authorizationHash, 'settled', { output, transaction: settled.transaction, payer: settled.payer || '' }).catch(() => undefined);
    return NextResponse.json({ service: service.id, output, payment: { transaction: settled.transaction, network: settled.network,
      amount: payment.paymentRequirements.amount, asset: payment.paymentRequirements.asset, payer: settled.payer } },
    { headers: { ...settled.headers, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('MARKET_PAYMENT_')) {
      return NextResponse.json({ error: 'City payments are temporarily unavailable.' }, { status: 503 });
    }
    return apiFailure(error);
  }
}
