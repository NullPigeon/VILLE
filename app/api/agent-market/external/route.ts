import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { parsePaymentPayload } from '@x402/core/schemas';
import { EXTERNAL_MARKET_SERVICES, externalMarketRequest, externalMarketService, externalModelCatalog, externalModelHolderOnly, externalResourceMatches } from '@/lib/external-market';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { claimMarketOrder, finishMarketOrder, marketHash, marketOrder, marketOrderStorageReady } from '@/lib/server/market-orders';
import { linkedAgentCredential } from '@/lib/server/linked-agents';
import { hasMarketHolderAccess } from '@/lib/server/agent-market';
import { checkAgentMarketBudget, releaseAgentMarketSpend, reserveAgentMarketSpend, settleAgentMarketSpend } from '@/lib/server/market-agent-budget';

export const runtime = 'nodejs';
export const maxDuration = 90;
const NETWORK = 'eip155:4663';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const noStore = { 'Cache-Control': 'private, no-store' };

function quoteToken(owner: string, serviceId: string, input: string, modelId: string, expires: number, amount: string, payTo: string) {
  const secret = process.env.WALLET_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, 'Wallet checkout is not configured.');
  const message = JSON.stringify([owner.toLowerCase(), serviceId, input.trim(), modelId, expires, amount, payTo.toLowerCase()]);
  return `${expires}.${amount}.${payTo.toLowerCase()}.${createHmac('sha256', secret).update(message).digest('hex')}`;
}

function verifyQuoteToken(token: string, owner: string, serviceId: string, input: string, modelId: string) {
  const [stamp, amount, payTo, digest, extra] = token.split('.');
  if (!/^\d{13}$/.test(stamp || '') || !/^\d{1,7}$/.test(amount || '') ||
    BigInt(amount) <= 0n || BigInt(amount) > 2_000_000n || !/^0x[0-9a-f]{40}$/.test(payTo || '') ||
    !/^[0-9a-f]{64}$/.test(digest || '') || extra !== undefined) throw new ApiError(409, 'Refresh the merchant quote before paying.');
  const expires = Number(stamp);
  if (expires < Date.now() || expires > Date.now() + 5 * 60_000) throw new ApiError(409, 'Merchant quote expired. Refresh it before paying.');
  const expected = quoteToken(owner, serviceId, input, modelId, expires, amount, payTo).split('.')[3];
  if (!timingSafeEqual(Buffer.from(digest), Buffer.from(expected))) throw new ApiError(409, 'Merchant quote does not match this request.');
  return { amount: BigInt(amount), payTo };
}

export async function GET(request: NextRequest) {
  try {
    const modelSource = request.nextUrl.searchParams.get('models');
    if (modelSource === 'model-network' || modelSource === 'metered-models') {
      return NextResponse.json({ models: await externalModelCatalog(modelSource) }, { headers: noStore });
    }
    return NextResponse.json({ services: EXTERNAL_MARKET_SERVICES }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}

function externalPaymentChallenge(body: unknown, header: string | null, serviceId: string, expectedUrl: string) {
  let value = body;
  if ((!value || typeof value !== 'object' || !('accepts' in value)) && header) {
    try { value = JSON.parse(Buffer.from(header, 'base64').toString('utf8')); } catch { /* invalid quote */ }
  }
  if (!value || typeof value !== 'object') throw new ApiError(502, 'Merchant returned an unreadable payment quote.');
  const quote = value as Record<string, unknown>;
  if (quote.x402Version !== 2) throw new ApiError(409, 'This merchant does not offer x402 v2 checkout.');
  const offers = Array.isArray(quote.accepts) ? quote.accepts : [];
  const offer = offers.find((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return false;
    const item = entry as Record<string, unknown>;
    const amount = typeof item.amount === 'string' && /^\d+$/.test(item.amount) ? BigInt(item.amount) : 0n;
    return item.scheme === 'exact' && item.network === NETWORK &&
      typeof item.asset === 'string' && item.asset.toLowerCase() === USDG.toLowerCase() &&
      amount > 0n && amount <= 2_000_000n && typeof item.payTo === 'string' && /^0x[0-9a-fA-F]{40}$/.test(item.payTo);
  });
  if (!offer) throw new ApiError(409, 'This merchant does not offer eligible USDG on Robinhood Chain.');
  const resource = quote.resource as { url?: unknown } | undefined;
  if (!resource || typeof resource.url !== 'string' || !externalResourceMatches(serviceId, resource.url, expectedUrl)) {
    throw new ApiError(502, 'Merchant payment route differs from the requested service.');
  }
  return { ...quote, accepts: [offer] };
}

function paymentReceipt(header: string | null) {
  if (!header) throw new ApiError(502, 'Merchant delivered work without a payment receipt. Check your wallet.');
  let value: Record<string, unknown>;
  try { value = JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as Record<string, unknown>; }
  catch { throw new ApiError(502, 'Merchant returned an unreadable payment receipt. Check your wallet.'); }
  if (value.success !== true || value.network !== NETWORK || typeof value.transaction !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value.transaction)) {
    throw new ApiError(502, 'Merchant receipt does not match Robinhood Chain. Check your wallet.');
  }
  return { transaction: value.transaction, network: value.network, payer: typeof value.payer === 'string' ? value.payer : '' };
}

function verifySignedMerchantQuote(signature: string, amount: bigint, payTo: string, serviceId: string, expectedUrl: string) {
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(signature, 'base64').toString('utf8')); }
  catch { throw new ApiError(409, 'Payment signature is unreadable. Refresh the quote.'); }
  const result = parsePaymentPayload(decoded);
  if (!result.success || result.data.x402Version !== 2) throw new ApiError(409, 'Payment signature does not match x402 v2.');
  const { accepted, resource } = result.data;
  if (accepted.scheme !== 'exact' || accepted.network !== NETWORK ||
    accepted.asset.toLowerCase() !== USDG.toLowerCase() || accepted.amount !== amount.toString() ||
    accepted.payTo.toLowerCase() !== payTo.toLowerCase() ||
    !resource?.url || !externalResourceMatches(serviceId, resource.url, expectedUrl)) {
    throw new ApiError(409, 'Signed merchant payment differs from the quoted service or price.');
  }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
    const agent = token ? await linkedAgentCredential(token) : null;
    const owner = agent?.ownerWallet || requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['serviceId', 'input', 'modelId', 'paymentSignature', 'quoteToken'].includes(key)) ||
      typeof body.serviceId !== 'string' || typeof body.input !== 'string') throw new ApiError(400, 'Choose one merchant service and enter its input.');
    const service = externalMarketService(body.serviceId);
    if (!service) throw new ApiError(404, 'Merchant service not found.');
    const modelId = service.modelPicker && typeof body.modelId === 'string' ? body.modelId : '';
    if (service.modelPicker) {
      if (!body.paymentSignature) {
        const models = await externalModelCatalog(service.id as 'model-network' | 'metered-models');
        if (!models.some((model) => model.id === modelId)) throw new ApiError(400, 'Choose a model from the live catalog.');
      }
      if (externalModelHolderOnly(modelId) && !await hasMarketHolderAccess(owner).catch(() => false)) {
        throw new ApiError(403, 'Hold at least 1M SCRAPY in your linked wallet to use this advanced model.');
      }
    } else if (body.modelId !== undefined) throw new ApiError(400, 'This service does not accept a model selection.');
    let upstream;
    try { upstream = externalMarketRequest(service, body.input, modelId); }
    catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'Invalid service input.'); }
    const signature = body.paymentSignature;
    if (signature !== undefined && (typeof signature !== 'string' || signature.length > 12_000 || !/^[A-Za-z0-9+/=_-]+$/.test(signature))) {
      throw new ApiError(400, 'Invalid x402 payment signature.');
    }
    const authorizationHash = signature ? marketHash(signature) : null;
    const requestHash = marketHash(JSON.stringify(modelId ? [service.id, body.input.trim(), modelId] : [service.id, body.input.trim()]));
    if (signature) {
      if (typeof body.quoteToken !== 'string') throw new ApiError(409, 'Refresh the merchant quote before paying.');
      const { amount, payTo } = verifyQuoteToken(body.quoteToken, owner, service.id, body.input, modelId);
      verifySignedMerchantQuote(signature, amount, payTo, service.id, upstream.url);
      if (agent) await checkAgentMarketBudget(agent, 'merchants', amount);
      if (!await marketOrderStorageReady()) throw new ApiError(503, 'Market receipt storage is unavailable.');
      const existing = await marketOrder(authorizationHash!);
      if (existing) {
        if (existing.service_id !== `external:${service.id}` || existing.prompt_hash !== requestHash) throw new ApiError(409, 'Payment authorization belongs to another request.');
        if (existing.status === 'settled' && existing.output && existing.transaction_hash) {
          return NextResponse.json({ service: service.id, output: existing.output,
            payment: { transaction: existing.transaction_hash, network: NETWORK, payer: existing.payer }, replayed: true }, { headers: noStore });
        }
        throw new ApiError(409, 'This payment is already being processed or needs review. Check your wallet before retrying.');
      }
      await reserveAgentMarketSpend(agent, 'merchants', amount, authorizationHash!);
      try {
        if (!await claimMarketOrder(authorizationHash!, `external:${service.id}`, requestHash)) throw new ApiError(409, 'This payment is already being processed.');
      } catch (error) { await releaseAgentMarketSpend(agent, authorizationHash!).catch(() => undefined); throw error; }
    }
    let response: Response;
    try {
      response = await fetch(upstream.url, { method: upstream.method, redirect: 'error', cache: 'no-store',
        headers: { Accept: 'application/json', ...(upstream.body ? { 'Content-Type': 'application/json' } : {}),
          ...(signature ? { 'PAYMENT-SIGNATURE': signature } : {}) },
        body: upstream.body, signal: AbortSignal.timeout(70_000) });
    } catch {
      if (authorizationHash) await finishMarketOrder(authorizationHash, 'settlement_unknown').catch(() => undefined);
      throw new ApiError(503, signature ? 'Merchant did not answer. Check your wallet before retrying.' : 'Merchant did not answer. No payment was made.');
    }
    const raw = await response.text();
    if (response.status === 402 && raw.length > 100_000) throw new ApiError(502, 'Merchant quote is too large to process safely.');
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    if (response.status === 402) {
      if (signature) {
        await releaseAgentMarketSpend(agent, authorizationHash!).catch(() => undefined);
        await finishMarketOrder(authorizationHash!, 'settlement_unknown').catch(() => undefined);
        throw new ApiError(409, 'Merchant rejected payment or changed the quote. Check your wallet before retrying.');
      }
      const quote = externalPaymentChallenge(parsed, response.headers.get('payment-required'), service.id, upstream.url);
      const offer = quote.accepts[0] as { amount: string; payTo: string };
      if (agent) await checkAgentMarketBudget(agent, 'merchants', BigInt(offer.amount));
      return NextResponse.json({ serviceId: service.id, modelId, quote, quoteToken: quoteToken(owner, service.id, body.input, modelId, Date.now() + 5 * 60_000, offer.amount, offer.payTo),
        amountUsd: (Number(offer.amount) / 1_000_000).toFixed(6), payTo: offer.payTo }, { status: 402, headers: noStore });
    }
    if (!signature) throw new ApiError(502, 'Merchant did not request an x402 payment. This listing is temporarily unavailable.');
    if (!response.ok) {
      await finishMarketOrder(authorizationHash!, 'settlement_unknown').catch(() => undefined);
      throw new ApiError(502, 'Merchant could not complete the paid request. Check your wallet before retrying.');
    }
    let payment;
    try { payment = paymentReceipt(response.headers.get('payment-response') || response.headers.get('x-payment-response')); }
    catch (error) {
      await finishMarketOrder(authorizationHash!, 'settlement_unknown').catch(() => undefined);
      throw error;
    }
    const chat = parsed && typeof parsed === 'object' && 'choices' in parsed
      ? (parsed as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content : undefined;
    const output = typeof chat === 'string' ? chat : parsed === null ? raw : JSON.stringify(parsed, null, 2);
    await finishMarketOrder(authorizationHash!, 'settled', { output: output.slice(0, 18_000), transaction: payment.transaction, payer: payment.payer });
    await settleAgentMarketSpend(agent, authorizationHash!, payment.transaction).catch(() => undefined);
    return NextResponse.json({ service: service.id, output: output.slice(0, 18_000), payment, merchant: service.provider }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}
