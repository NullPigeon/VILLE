import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { EXTERNAL_MARKET_SERVICES, externalMarketRequest, externalMarketService, externalResourceMatches } from '@/lib/external-market';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { claimMarketOrder, finishMarketOrder, marketHash, marketOrder, marketOrderStorageReady } from '@/lib/server/market-orders';
import { linkedAgentOwner } from '@/lib/server/linked-agents';

export const runtime = 'nodejs';
export const maxDuration = 90;
const NETWORK = 'eip155:4663';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const noStore = { 'Cache-Control': 'private, no-store' };

function quoteToken(owner: string, serviceId: string, input: string, expires: number) {
  const secret = process.env.WALLET_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, 'Wallet checkout is not configured.');
  const message = JSON.stringify([owner.toLowerCase(), serviceId, input.trim(), expires]);
  return `${expires}.${createHmac('sha256', secret).update(message).digest('hex')}`;
}

function verifyQuoteToken(token: string, owner: string, serviceId: string, input: string) {
  const [stamp, digest] = token.split('.');
  if (!/^\d{13}$/.test(stamp || '') || !/^[0-9a-f]{64}$/.test(digest || '')) throw new ApiError(409, 'Refresh the merchant quote before paying.');
  const expires = Number(stamp);
  if (expires < Date.now() || expires > Date.now() + 5 * 60_000) throw new ApiError(409, 'Merchant quote expired. Refresh it before paying.');
  const expected = quoteToken(owner, serviceId, input, expires).split('.')[1];
  if (!timingSafeEqual(Buffer.from(digest), Buffer.from(expected))) throw new ApiError(409, 'Merchant quote does not match this request.');
}

export async function GET() {
  return NextResponse.json({ services: EXTERNAL_MARKET_SERVICES }, { headers: noStore });
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

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
    const owner = token ? await linkedAgentOwner(token) : requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['serviceId', 'input', 'paymentSignature', 'quoteToken'].includes(key)) ||
      typeof body.serviceId !== 'string' || typeof body.input !== 'string') throw new ApiError(400, 'Choose one merchant service and enter its input.');
    const service = externalMarketService(body.serviceId);
    if (!service) throw new ApiError(404, 'Merchant service not found.');
    let upstream;
    try { upstream = externalMarketRequest(service, body.input); }
    catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'Invalid service input.'); }
    const signature = body.paymentSignature;
    if (signature !== undefined && (typeof signature !== 'string' || signature.length > 12_000 || !/^[A-Za-z0-9+/=_-]+$/.test(signature))) {
      throw new ApiError(400, 'Invalid x402 payment signature.');
    }
    const authorizationHash = signature ? marketHash(signature) : null;
    const requestHash = marketHash(JSON.stringify([service.id, body.input.trim()]));
    if (signature) {
      if (typeof body.quoteToken !== 'string') throw new ApiError(409, 'Refresh the merchant quote before paying.');
      verifyQuoteToken(body.quoteToken, owner, service.id, body.input);
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
      if (!await claimMarketOrder(authorizationHash!, `external:${service.id}`, requestHash)) throw new ApiError(409, 'This payment is already being processed.');
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
        await finishMarketOrder(authorizationHash!, 'settlement_unknown').catch(() => undefined);
        throw new ApiError(409, 'Merchant rejected payment or changed the quote. Check your wallet before retrying.');
      }
      const quote = externalPaymentChallenge(parsed, response.headers.get('payment-required'), service.id, upstream.url);
      const offer = quote.accepts[0] as { amount: string; payTo: string };
      return NextResponse.json({ serviceId: service.id, quote, quoteToken: quoteToken(owner, service.id, body.input, Date.now() + 5 * 60_000),
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
    return NextResponse.json({ service: service.id, output: output.slice(0, 18_000), payment, merchant: service.provider }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}
