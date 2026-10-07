export type ExternalMarketService = {
  id: string;
  name: string;
  provider: 'agent402' | 'spraay' | 'stockkit';
  category: 'AI Models' | 'Search' | 'Web & Scraping' | 'Market Data';
  description: string;
  input: 'prompt' | 'query' | 'url' | 'symbol' | 'address' | 'none';
  placeholder: string;
  docs: string;
};

// Each upstream route is constructed here, never from a caller-supplied URL.
// A listing is usable only when its live 402 quote offers USDG on Robinhood Chain.
export const EXTERNAL_MARKET_SERVICES: ExternalMarketService[] = [
  { id: 'agent402-auto-chat', name: 'Auto Model Chat', provider: 'agent402', category: 'AI Models',
    description: 'One AI answer; the merchant chooses a suitable model for your task.', input: 'prompt',
    placeholder: 'What should this model help you with?', docs: 'https://agent402.tools/tools/category/llm' },
  { id: 'agent402-search', name: 'Live Web Search', provider: 'agent402', category: 'Search',
    description: 'Current links and snippets from Agent402.', input: 'query',
    placeholder: 'What should your agent find?', docs: 'https://agent402.tools/tools/search' },
  { id: 'agent402-extract', name: 'Read a Web Page', provider: 'agent402', category: 'Web & Scraping',
    description: 'Extract the main article from one public page.', input: 'url',
    placeholder: 'https://example.com/article', docs: 'https://agent402.tools/tools/extract' },
  { id: 'agent402-render', name: 'Read a Dynamic Page', provider: 'agent402', category: 'Web & Scraping',
    description: 'Render a JavaScript page in a browser and return its readable text.', input: 'url',
    placeholder: 'https://example.com/app', docs: 'https://agent402.tools/tools/render' },
  { id: 'agent402-pdf', name: 'Read a PDF', provider: 'agent402', category: 'Web & Scraping',
    description: 'Extract text and page details from one public PDF URL.', input: 'url',
    placeholder: 'https://example.com/report.pdf', docs: 'https://agent402.tools/tools/pdf' },
  { id: 'spraay-prices', name: 'Crypto Price Feed', provider: 'spraay', category: 'Market Data',
    description: 'Read Spraay’s current multi-token price feed.', input: 'none',
    placeholder: '', docs: 'https://docs.spraay.app/' },
  { id: 'stockkit-research', name: 'Stock Token Research', provider: 'stockkit', category: 'Market Data',
    description: 'Company fundamentals and Robinhood Chain token context.', input: 'symbol',
    placeholder: 'NVDA', docs: 'https://docs.stockkit.dev/products/x402-api/' },
  { id: 'stockkit-portfolio', name: 'Stock Token Portfolio', provider: 'stockkit', category: 'Market Data',
    description: 'Stock token holdings for one public wallet address.', input: 'address',
    placeholder: '0x…', docs: 'https://docs.stockkit.dev/products/x402-api/' },
  { id: 'stockkit-history', name: 'Stock Token History', provider: 'stockkit', category: 'Market Data',
    description: 'Onchain price history for a tokenized stock.', input: 'symbol',
    placeholder: 'NVDA', docs: 'https://docs.stockkit.dev/products/market-api/' },
];

export function externalMarketService(id: string) {
  return EXTERNAL_MARKET_SERVICES.find((service) => service.id === id);
}

export function externalResourceMatches(serviceId: string, quotedUrl: string, requestUrl: string) {
  if (quotedUrl === requestUrl) return true;
  // Agent402 signs its fixed route and omits the user's search query from resource.url.
  if (serviceId === 'agent402-search') {
    try {
      const quoted = new URL(quotedUrl);
      const requested = new URL(requestUrl);
      return quoted.origin === requested.origin && quoted.pathname === requested.pathname && !quoted.search && !quoted.hash;
    } catch { return false; }
  }
  return false;
}

export function externalMarketRequest(service: ExternalMarketService, rawInput: string) {
  const input = rawInput.trim();
  if (input.length > 1000) throw new Error('Keep this request under 1,000 characters.');
  if (service.input !== 'none' && !input) throw new Error('Enter a request for this service.');
  if (service.input === 'symbol' && !/^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(input)) throw new Error('Enter a stock symbol such as NVDA.');
  if (service.input === 'address' && !/^0x[0-9a-fA-F]{40}$/.test(input)) throw new Error('Enter one EVM wallet address.');
  if (service.input === 'url') {
    let url: URL;
    try { url = new URL(input); } catch { throw new Error('Enter one public HTTPS URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') ||
      /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(url.hostname)) throw new Error('Enter one public HTTPS URL.');
  }
  if (service.id === 'agent402-auto-chat') return { url: 'https://agent402.tools/v1/auto/chat/completions', method: 'POST' as const,
    body: JSON.stringify({ messages: [{ role: 'user', content: input }], max_tokens: 700, stream: false }) };
  if (service.id === 'agent402-search') return { url: `https://agent402.tools/api/search?q=${encodeURIComponent(input)}`, method: 'GET' as const, body: undefined };
  if (service.id === 'agent402-extract') return { url: 'https://agent402.tools/api/extract', method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'agent402-render') return { url: 'https://agent402.tools/api/render', method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'agent402-pdf') return { url: 'https://agent402.tools/api/pdf', method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'spraay-prices') return { url: 'https://gateway.spraay.app/api/v1/prices', method: 'GET' as const, body: undefined };
  if (service.id === 'stockkit-research') return { url: `https://api.stockkit.dev/v1/x402/research/${input.toUpperCase()}`, method: 'GET' as const, body: undefined };
  if (service.id === 'stockkit-portfolio') return { url: `https://api.stockkit.dev/v1/x402/portfolio/${input}`, method: 'GET' as const, body: undefined };
  if (service.id === 'stockkit-history') return { url: `https://api.stockkit.dev/v1/x402/history/${input.toUpperCase()}`, method: 'GET' as const, body: undefined };
  throw new Error('Service not found.');
}
