import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { MARKET_CURRENCY, MARKET_NETWORK } from '@/lib/agent-market';
import { MARKET_SERVICES, marketService } from '@/lib/market-services';
import { marketServiceConfigured } from '@/lib/server/market-catalog';
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
    return toolResult({ network: MARKET_NETWORK, currency: MARKET_CURRENCY, services: matches.map((service) => ({
      id: service.id, name: service.name, category: service.category, description: service.description,
      provider: service.provider, holderOnly: service.holderOnly,
      status: ready && marketServiceConfigured(service) ? 'configured' : 'preparing',
    })) });
  });

  server.registerTool('get_market_service', {
    title: 'Get a LANDVILLE Service',
    description: 'Read one service, its access rules and payment route. Paid execution happens on the service HTTP endpoint through x402, not inside this discovery tool.',
    inputSchema: z.object({ id: z.string().min(1).max(80) }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ id }) => {
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
