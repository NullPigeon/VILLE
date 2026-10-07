import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { MARKET_CURRENCY, MARKET_NETWORK } from '@/lib/agent-market';
import { MARKET_SERVICES, marketService } from '@/lib/market-services';
import { EXTERNAL_MARKET_SERVICES, externalMarketService } from '@/lib/external-market';
import { marketServiceConfigured } from '@/lib/server/market-catalog';
import { database } from '@/lib/server/database';
import { sellerAmounts, sellerPayoutReady } from '@/lib/server/market-economy';
import { marketOrderStorageReady } from '@/lib/server/market-orders';
import { getMarketPaymentServer, marketPaymentsConfigured } from '@/lib/server/market-x402';

export const runtime = 'nodejs';

async function paymentsReady() {
  return marketPaymentsConfigured() && await marketOrderStorageReady()
    && await getMarketPaymentServer().then(() => true).catch(() => false);
}

function toolResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}

type PublicStall = { id: string; owner_wallet: string; base_service_id: string; title: string;
  description: string; markup_micro: number };

async function citizenServices() {
  if (!sellerPayoutReady() || !await paymentsReady()) return [];
  const rows = await database<PublicStall[]>(
    'landville_market_stall_drafts?select=id,owner_wallet,base_service_id,title,description,markup_micro&status=eq.published&order=published_at.desc&limit=100');
  return rows.flatMap((row) => {
    const base = marketService(row.base_service_id);
    if (!base || !marketServiceConfigured(base)) return [];
    try { return [{ id: `stall:${row.id}`, name: row.title, category: base.category,
      description: row.description, provider: row.owner_wallet, holderOnly: false, status: 'configured',
      price: sellerAmounts(base.priceUsd, row.markup_micro).priceUsd,
      paymentRoute: `/api/agent-market/stalls/${row.id}/buy` }]; } catch { return []; }
  });
}

const handler = createMcpHandler((server) => {
  server.registerTool('search_market', {
    title: 'Search LANDVILLE Market',
    description: 'Discover LANDVILLE-operated AI models and tools. This is a public catalogue; listing a service does not mean checkout is open.',
    inputSchema: z.object({ query: z.string().max(100).optional(), category: z.string().max(40).optional() }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ query, category }) => {
    const ready = await paymentsReady();
    const term = query?.trim().toLowerCase() || '';
    const matches = MARKET_SERVICES.filter((service) => (!category || service.category.toLowerCase() === category.toLowerCase())
      && (!term || `${service.name} ${service.category} ${service.description} ${service.provider}`.toLowerCase().includes(term)));
    const merchants = EXTERNAL_MARKET_SERVICES.filter((service) => (!category || service.category.toLowerCase() === category.toLowerCase())
      && (!term || `${service.name} ${service.category} ${service.description} ${service.provider}`.toLowerCase().includes(term)));
    const citizens = await citizenServices().catch(() => []);
    return toolResult({ network: MARKET_NETWORK, currency: MARKET_CURRENCY, services: [...matches.map((service) => ({
      id: service.id, name: service.name, category: service.category, description: service.description,
      provider: service.provider, holderOnly: service.holderOnly,
      status: ready && marketServiceConfigured(service) ? 'configured' : 'preparing',
    })), ...merchants.map((service) => ({ id: service.id, name: service.name, category: service.category,
      description: service.description, provider: service.provider, holderOnly: false, status: 'live-quote',
      paymentRoute: '/api/agent-market/external' })), ...citizens.filter((service) =>
      (!category || service.category.toLowerCase() === category.toLowerCase()) &&
      (!term || `${service.name} ${service.category} ${service.description} ${service.provider}`.toLowerCase().includes(term)))] });
  });

  server.registerTool('get_market_service', {
    title: 'Get a LANDVILLE Service',
    description: 'Read one service, its access rules and payment route. Paid execution happens on the service HTTP endpoint through x402, not inside this discovery tool.',
    inputSchema: z.object({ id: z.string().min(1).max(80) }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ id }) => {
    if (id.startsWith('stall:') && /^[0-9a-f-]{36}$/i.test(id.slice(6))) {
      const stalls = await citizenServices().catch(() => []);
      const stall = stalls.find((item) => item.id === id);
      if (!stall) return { ...toolResult({ error: 'Citizen service is not available.' }), isError: true };
      return toolResult({ ...stall, network: MARKET_NETWORK, currency: MARKET_CURRENCY,
        method: 'POST', endpoint: stall.paymentRoute, requestBody: { prompt: 'Your focused task, 1-2000 characters' },
        paymentProtocol: 'x402 v2', note: 'A connected agent needs an owner-enabled daily budget and signs with its own payment wallet.' });
    }
    const merchant = externalMarketService(id);
    if (merchant) return toolResult({ ...merchant, status: 'live-quote', paymentProtocol: 'x402 v2',
      network: MARKET_NETWORK, currency: MARKET_CURRENCY, method: 'POST', endpoint: '/api/agent-market/external',
      quoteBody: { serviceId: merchant.id, input: merchant.placeholder || '' },
      note: 'Request a live quote first, then pay the selected external merchant from your own wallet. A connected agent sends its profile key in Authorization: Bearer lvag_...; this key cannot spend its owner wallet.' });
    const service = marketService(id);
    if (!service) return { ...toolResult({ error: 'Service not found.' }), isError: true };
    const configured = await paymentsReady() && marketServiceConfigured(service);
    return toolResult({ id: service.id, name: service.name, description: service.description,
      category: service.category, provider: service.provider, model: service.model || null,
      holderOnly: service.holderOnly, status: configured ? 'configured' : 'preparing',
      ...(configured ? { price: service.priceUsd, currency: MARKET_CURRENCY,
        network: MARKET_NETWORK, method: 'POST', endpoint: `/api/agent-market/call/${service.id}`,
        requestBody: { prompt: 'Your focused task, 1-2000 characters' }, paymentProtocol: 'x402 v2' } : {}),
      note: service.holderOnly ? 'Holder services require verified SCRAPY holdings. A citizen may use a signed-in session; a connected external agent may send its own profile connection key as Authorization: Bearer lvag_... while paying from its own wallet. The key never signs a payment.' : undefined });
  });
}, { serverInfo: { name: 'LANDVILLE Agent Market', version: '0.1.0' } });

function guarded(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response('Cross-origin MCP requests are not allowed.', { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 65_536) return new Response('MCP request is too large.', { status: 413 });
  return handler(request);
}

export { guarded as GET, guarded as POST };
