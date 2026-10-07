import 'server-only';
import { marketService, type MarketService, type YardMarketSuggestion } from '@/lib/market-services';
import { marketServiceConfigured } from '@/lib/server/market-catalog';
import { marketOrderStorageReady } from '@/lib/server/market-orders';
import { getMarketPaymentServer, marketPaymentsConfigured } from '@/lib/server/market-x402';
import type { YardMessage } from '@/lib/personal-agent';

function matchService(text: string): MarketService | undefined {
  const lower = text.toLowerCase();
  const id = /0x[0-9a-f]{40}/i.test(text) ? 'chain-lens'
    : /\b(news|headlines)\b|новин|заголовк|новост/.test(lower) ? 'news-radar'
    : /https:\/\/[^\s]+/i.test(text) ? 'page-reader'
    : /\b(research|study|sourced brief|analyze sources)\b|дослідж|джерел|исследован/.test(lower) ? 'research-brief'
    : /\b(search|latest|current|sources|find online)\b|пошук|знайди|пошукай|шукай|найди/.test(lower) ? 'web-scout'
    : /\b(article|report|guide|essay|whitepaper|detailed document|longform)\b|статт|доповід|доклад|гайд|стать|отч[её]т/.test(lower) ? 'long-form'
    : /\b(landville|district|building|world|city gap)\b|лендвіл|район|будівл|будинок|міст[оаі]|город/.test(lower) ? 'world-audit'
    : undefined;
  return id ? marketService(id) : undefined;
}

export async function yardMarketSuggestion(text: string): Promise<YardMarketSuggestion | null> {
  const service = matchService(text);
  if (!service || !marketPaymentsConfigured() || !marketServiceConfigured(service) || !await marketOrderStorageReady()
    || !await getMarketPaymentServer().then(() => true).catch(() => false)) return null;
  return { serviceId: service.id, name: service.name, priceUsd: service.priceUsd, prompt: text.slice(0, 600) };
}

export async function yardMarketSuggestions(messages: YardMessage[]) {
  const suggestions: Record<string, YardMarketSuggestion> = {};
  if (!marketPaymentsConfigured() || !await marketOrderStorageReady()
    || !await getMarketPaymentServer().then(() => true).catch(() => false)) return suggestions;
  let lastCitizen: YardMessage | undefined;
  for (const message of messages) {
    if (message.role === 'CITIZEN') lastCitizen = message;
    else if (message.role === 'AGENT' && lastCitizen) {
      const service = matchService(lastCitizen.body);
      if (service && marketServiceConfigured(service)) suggestions[message.id] = {
        serviceId: service.id, name: service.name, priceUsd: service.priceUsd, prompt: lastCitizen.body.slice(0, 600),
      };
      lastCitizen = undefined;
    } else lastCitizen = undefined;
  }
  return suggestions;
}
