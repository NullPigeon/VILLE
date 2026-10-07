export type ExternalMarketService = {
  id: string;
  name: string;
  provider: 'agent402' | 'spraay' | 'stockkit' | 'relay';
  category: 'AI Models' | 'Search' | 'Research' | 'Web & Scraping' | 'Market Data' | 'Site & Domains';
  description: string;
  input: 'prompt' | 'query' | 'url' | 'symbol' | 'address' | 'domain' | 'none';
  placeholder: string;
  docs?: string;
  modelPicker?: boolean;
};

// Each upstream route is constructed here, never from a caller-supplied URL.
// A listing is usable only when its live 402 quote offers USDG on Robinhood Chain.
export const EXTERNAL_MARKET_SERVICES: ExternalMarketService[] = [
  { id: 'model-network', name: 'Choose an AI model', provider: 'relay', category: 'AI Models',
    description: 'Choose a model and pay its live USDG quote per request. No provider account needed.', input: 'prompt',
    placeholder: 'What should this model do for you?', modelPicker: true },
  { id: 'metered-models', name: 'Choose an AI model', provider: 'agent402', category: 'AI Models',
    description: 'Choose an AI model and see its live USDG price before paying.', input: 'prompt',
    placeholder: 'Describe a task, article, code question or report.', modelPicker: true },
  { id: 'agent402-auto-chat', name: 'Quick AI answer', provider: 'agent402', category: 'AI Models',
    description: 'Ask a question without choosing a model. Pay for one answer.', input: 'prompt',
    placeholder: 'What should this model help you with?', docs: 'https://agent402.tools/tools/category/llm' },
  { id: 'agent402-search', name: 'Live Web Search', provider: 'agent402', category: 'Search',
    description: 'Current links and snippets from Agent402.', input: 'query',
    placeholder: 'What should your agent find?', docs: 'https://agent402.tools/tools/search' },
  { id: 'agent402-news', name: 'Latest News', provider: 'agent402', category: 'Search',
    description: 'Find recent news and source links on a topic.', input: 'query',
    placeholder: 'Which news topic should we check?', docs: 'https://agent402.tools/tools/category/web' },
  { id: 'agent402-answer', name: 'Answer with Sources', provider: 'agent402', category: 'Research',
    description: 'Get a short answer grounded in live web results, with citations.', input: 'query',
    placeholder: 'What question should we research?', docs: 'https://agent402.tools/tools/answer' },
  { id: 'agent402-extract', name: 'Read a Web Page', provider: 'agent402', category: 'Web & Scraping',
    description: 'Extract the main article from one public page.', input: 'url',
    placeholder: 'https://example.com/article', docs: 'https://agent402.tools/tools/extract' },
  { id: 'agent402-render', name: 'Read a Dynamic Page', provider: 'agent402', category: 'Web & Scraping',
    description: 'Render a JavaScript page in a browser and return its readable text.', input: 'url',
    placeholder: 'https://example.com/app', docs: 'https://agent402.tools/tools/render' },
  { id: 'agent402-pdf', name: 'Read a PDF', provider: 'agent402', category: 'Web & Scraping',
    description: 'Extract text and page details from one public PDF URL.', input: 'url',
    placeholder: 'https://example.com/report.pdf', docs: 'https://agent402.tools/tools/pdf' },
  { id: 'agent402-robots', name: 'Check Crawl Access', provider: 'agent402', category: 'Site & Domains',
    description: 'Check whether a site allows bots to read a page and find its sitemap.', input: 'url',
    placeholder: 'https://example.com/article', docs: 'https://agent402.tools/tools/robots-check' },
  { id: 'agent402-http-check', name: 'Check Site Status', provider: 'agent402', category: 'Site & Domains',
    description: 'Check whether a public URL is responding and how long it takes.', input: 'url',
    placeholder: 'https://example.com', docs: 'https://agent402.tools/tools/http-check' },
  { id: 'agent402-dns', name: 'Look Up DNS', provider: 'agent402', category: 'Site & Domains',
    description: 'Find current DNS records for a public domain.', input: 'domain',
    placeholder: 'example.com', docs: 'https://agent402.tools/tools/dns-lookup' },
  { id: 'agent402-whois', name: 'Domain Registration', provider: 'agent402', category: 'Site & Domains',
    description: 'Find a domain’s registrar, creation date and expiry.', input: 'domain',
    placeholder: 'example.com', docs: 'https://agent402.tools/tools/whois' },
  { id: 'agent402-tls', name: 'Check TLS Certificate', provider: 'agent402', category: 'Site & Domains',
    description: 'See who issued a site certificate and when it expires.', input: 'domain',
    placeholder: 'example.com', docs: 'https://agent402.tools/tools/tls-cert' },
  { id: 'agent402-crypto-news', name: 'Crypto Headlines', provider: 'agent402', category: 'Market Data',
    description: 'Read recent crypto headlines from major publications.', input: 'query',
    placeholder: 'bitcoin', docs: 'https://agent402.tools/tools/crypto-news' },
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
  if (serviceId === 'agent402-search' || serviceId === 'agent402-news' || serviceId === 'agent402-answer') {
    try {
      const quoted = new URL(quotedUrl);
      const requested = new URL(requestUrl);
      return quoted.origin === requested.origin && quoted.pathname === requested.pathname && !quoted.search && !quoted.hash;
    } catch { return false; }
  }
  return false;
}

export function externalMarketRequest(service: ExternalMarketService, rawInput: string, modelId = '') {
  const input = rawInput.trim();
  if (input.length > (service.modelPicker ? 4000 : 1000)) throw new Error('Keep this request shorter.');
  if (service.input !== 'none' && !input) throw new Error('Enter a request for this service.');
  if (service.modelPicker && (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:/-]{0,120}$/i.test(modelId) || modelId.includes('*'))) {
    throw new Error('Choose a model from the live catalog.');
  }
  if (service.input === 'symbol' && !/^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(input)) throw new Error('Enter a stock symbol such as NVDA.');
  if (service.input === 'address' && !/^0x[0-9a-fA-F]{40}$/.test(input)) throw new Error('Enter one EVM wallet address.');
  if (service.input === 'domain' && (input.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(input) || /\.(?:local|internal|test|invalid|example|onion)$/i.test(input))) {
    throw new Error('Enter a public domain such as example.com.');
  }
  if (service.input === 'url') {
    let url: URL;
    try { url = new URL(input); } catch { throw new Error('Enter one public HTTPS URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') ||
      /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(url.hostname)) throw new Error('Enter one public HTTPS URL.');
  }
  if (service.id === 'agent402-auto-chat') return { url: 'https://agent402.tools/v1/auto/chat/completions', method: 'POST' as const,
    body: JSON.stringify({ messages: [{ role: 'user', content: input }], max_tokens: 700, stream: false }) };
  if (service.id === 'model-network') return { url: 'https://api.meshgateway.co/x/openrouter/v1/chat/completions', method: 'POST' as const,
    body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: input }], max_tokens: 2000, stream: false }) };
  if (service.id === 'metered-models') return { url: 'https://agent402.tools/v1/metered/chat/completions', method: 'POST' as const,
    body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: input }], max_tokens: 2000, stream: false }) };
  if (service.id === 'agent402-search') return { url: `https://agent402.tools/api/search?q=${encodeURIComponent(input)}`, method: 'GET' as const, body: undefined };
  if (service.id === 'agent402-news') return { url: `https://agent402.tools/api/search-news?q=${encodeURIComponent(input)}`, method: 'GET' as const, body: undefined };
  if (service.id === 'agent402-answer') return { url: `https://agent402.tools/api/answer?q=${encodeURIComponent(input)}`, method: 'GET' as const, body: undefined };
  if (service.id === 'agent402-extract') return { url: 'https://agent402.tools/api/extract', method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'agent402-render') return { url: 'https://agent402.tools/api/render', method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'agent402-pdf') return { url: 'https://agent402.tools/api/pdf', method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'agent402-robots') return { url: 'https://agent402.tools/api/robots-check', method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'agent402-http-check') return { url: 'https://agent402.tools/api/http-check', method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'agent402-dns') return { url: 'https://agent402.tools/api/dns-lookup', method: 'POST' as const,
    body: JSON.stringify({ host: input, type: 'A' }) };
  if (service.id === 'agent402-whois') return { url: 'https://agent402.tools/api/whois', method: 'POST' as const,
    body: JSON.stringify({ domain: input }) };
  if (service.id === 'agent402-tls') return { url: 'https://agent402.tools/api/tls-cert', method: 'POST' as const,
    body: JSON.stringify({ host: input }) };
  if (service.id === 'agent402-crypto-news') return { url: 'https://agent402.tools/api/crypto-news', method: 'POST' as const,
    body: JSON.stringify({ query: input, limit: 10 }) };
  if (service.id === 'spraay-prices') return { url: 'https://gateway.spraay.app/api/v1/prices', method: 'GET' as const, body: undefined };
  if (service.id === 'stockkit-research') return { url: `https://api.stockkit.dev/v1/x402/research/${input.toUpperCase()}`, method: 'GET' as const, body: undefined };
  if (service.id === 'stockkit-portfolio') return { url: `https://api.stockkit.dev/v1/x402/portfolio/${input}`, method: 'GET' as const, body: undefined };
  if (service.id === 'stockkit-history') return { url: `https://api.stockkit.dev/v1/x402/history/${input.toUpperCase()}`, method: 'GET' as const, body: undefined };
  throw new Error('Service not found.');
}

export type ExternalModel = { id: string; name: string; provider: string; holderOnly: boolean };

// The same rule is applied to the model picker and to both checkout requests.
// A model's live x402 quote still decides whether it can actually be bought.
export function externalModelHolderOnly(modelId: string) {
  const id = modelId.toLowerCase();
  if (/(?:^|\/)claude-(?:opus|sonnet-[5-9])(?:[.:-]|$)/.test(id)) return true;
  if (/(?:^|\/)gpt-[56](?:[.:-]|$)/.test(id) && !/(?:nano|mini|luna)(?:[.:-]|$)/.test(id)) return true;
  if (/(?:^|\/)o[345](?:[.:-]|$)/.test(id) && !/-mini(?:[.:-]|$)/.test(id)) return true;
  return /(?:^|\/)gemini-(?:2\.5|[3-9](?:\.\d+)?)-pro(?:[.:-]|$)|(?:^|\/)grok-4(?:[.:-]|$)/.test(id);
}

const catalogCache = new Map<string, { expires: number; models: ExternalModel[] }>();

export async function externalModelCatalog(source: 'model-network' | 'metered-models'): Promise<ExternalModel[]> {
  const cached = catalogCache.get(source);
  if (cached && cached.expires > Date.now()) return cached.models;
  const url = source === 'model-network' ? 'https://openrouter.ai/api/v1/models' : 'https://agent402.tools/v1/models';
  const response = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error('Model catalog is temporarily unavailable.');
  const raw = await response.text();
  if (raw.length > 8_000_000) throw new Error('Model catalog is too large.');
  const parsed = JSON.parse(raw) as { data?: unknown };
  if (!Array.isArray(parsed.data)) throw new Error('Model catalog is unreadable.');
  const seen = new Set<string>();
  const models = parsed.data.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id : '';
    if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:/-]{0,120}$/i.test(id) || id.includes('*') || seen.has(id)) return [];
    const architecture = item.architecture as { output_modalities?: unknown } | undefined;
    if (source === 'model-network' && architecture?.output_modalities &&
      (!Array.isArray(architecture.output_modalities) || !architecture.output_modalities.includes('text'))) return [];
    seen.add(id);
    return [{ id, name: typeof item.name === 'string' ? item.name.slice(0, 100) : id.split('/').at(-1) || id,
      provider: id.split('/')[0], holderOnly: externalModelHolderOnly(id) }];
  }).slice(0, 1500);
  if (!models.length) throw new Error('No models are available right now.');
  catalogCache.set(source, { expires: Date.now() + 5 * 60_000, models });
  return models;
}
