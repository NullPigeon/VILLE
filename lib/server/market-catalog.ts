import 'server-only';
import type { MarketProvider, MarketService } from '@/lib/market-services';

const providerKeys: Partial<Record<MarketProvider, string>> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GEMINI_API_KEY',
  xai: 'XAI_API_KEY',
  groq: 'GROQ_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  brave: 'BRAVE_SEARCH_API_KEY',
  firecrawl: 'FIRECRAWL_API_KEY',
};

export function marketProviderKey(provider: MarketProvider) {
  const name = providerKeys[provider];
  return name ? process.env[name]?.trim() || '' : '';
}

export function marketServiceConfigured(service: MarketService) {
  const enabled = new Set((process.env.LANDVILLE_MARKET_ENABLED_IDS || '').split(',').map((id) => id.trim()).filter(Boolean));
  if (!enabled.has(service.id)) return false;
  if (service.kind === 'world-audit') return Boolean(process.env.OPENAI_API_KEY?.trim() && process.env.LANDVILLE_MARKET_MODEL?.trim());
  if (service.kind === 'long-form') return Boolean(process.env.OPENAI_API_KEY?.trim() && process.env.LANDVILLE_MARKET_MODEL?.trim());
  if (service.kind === 'research-brief') return Boolean(process.env.OPENAI_API_KEY?.trim() && process.env.BRAVE_SEARCH_API_KEY?.trim() && process.env.LANDVILLE_MARKET_MODEL?.trim());
  if (service.kind === 'chain-lens') return true;
  return Boolean(marketProviderKey(service.provider));
}

export function publicMarketService(service: MarketService, paymentsReady: boolean, holder: boolean) {
  return {
    id: service.id, name: service.name, category: service.category,
    provider: service.provider, kind: service.kind, model: service.model || null,
    priceUsd: service.priceUsd, description: service.description,
    holderOnly: service.holderOnly,
    endpoint: `/api/agent-market/call/${service.id}`,
    available: paymentsReady && marketServiceConfigured(service) && (!service.holderOnly || holder),
    status: !paymentsReady || !marketServiceConfigured(service) ? 'preparing' : service.holderOnly && !holder ? 'holder' : 'open',
  };
}
