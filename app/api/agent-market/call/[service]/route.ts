import { NextRequest, NextResponse } from 'next/server';
import { cityPaidService } from '@/lib/market-services';
import { ApiError, apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { getMarketPaymentServer, marketPaymentsConfigured } from '@/lib/server/market-x402';
import { performMarketWork } from '@/lib/server/market-work';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const { service: id } = await params;
  const service = cityPaidService(id);
  if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  if (!marketPaymentsConfigured()) return NextResponse.json({ error: 'City payments are not open yet.' }, { status: 503 });
  try {
    requireMutation(request);
    const body = await jsonBody(request);
    if (Object.keys(body).length !== 1 || typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 2000) {
      throw new ApiError(400, 'Send a prompt of 1–2000 characters.');
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
      paymentHeader: request.headers.get('payment-signature') ?? undefined,
    };
    const payment = await server.processHTTPRequest(context);
    if (payment.type === 'payment-error') {
      return NextResponse.json(payment.response.body ?? { error: 'Payment required.' },
        { status: payment.response.status, headers: { ...payment.response.headers, 'Cache-Control': 'private, no-store' } });
    }
    if (payment.type !== 'payment-verified') throw new Error('MARKET_PAYMENT_NOT_REQUIRED');
    let output: string;
    try {
      output = await performMarketWork(service.id, body.prompt.trim(), context.paymentHeader || 'anonymous');
    } catch (error) {
      await payment.cancellationDispatcher.cancel({ reason: 'handler_failed' }).catch(() => undefined);
      throw error;
    }
    const settled = await server.processSettlement(payment.paymentPayload, payment.paymentRequirements,
      payment.declaredExtensions, { request: context, responseHeaders: {} }, undefined, payment.beforeHandlerSettlement);
    if (!settled.success) {
      return NextResponse.json(settled.response.body ?? { error: 'Settlement failed. Check your wallet before retrying.' },
        { status: settled.response.status, headers: { ...settled.response.headers, 'Cache-Control': 'private, no-store' } });
    }
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
