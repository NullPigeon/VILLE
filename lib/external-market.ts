export type ExternalMarketService = {
  id: string;
  name: string;
  provider: 'agent402' | 'spraay' | 'stockkit' | 'relay' | 'mesh' | 'imperium';
  category: 'AI Models' | 'Media' | 'Search' | 'Research' | 'Web & Scraping' | 'Documents' | 'Market Data' | 'Weather' | 'Site & Domains' | 'Energy & Climate' | 'Developer';
  description: string;
  input: 'prompt' | 'query' | 'url' | 'symbol' | 'address' | 'domain' | 'coordinates' | 'none';
  placeholder: string;
  docs?: string;
  modelPicker?: boolean;
  fixedModelId?: string;
  maxOutputTokens?: number;
  holderOnly?: boolean;
  replacesCityServiceId?: string;
};

const RELAY_MODELS: Record<string, { modelId: string; name: string; holderOnly: boolean; maxOutputTokens: number }> = {
  'openai-luna': { modelId: 'openai/gpt-6-luna', name: 'GPT-6 Luna', holderOnly: false, maxOutputTokens: 800 },
  'openai-sol': { modelId: 'openai/gpt-6.1-sol', name: 'GPT-6.1 Sol', holderOnly: true, maxOutputTokens: 1000 },
  'openai-astra': { modelId: 'openai/gpt-6-astra', name: 'GPT-6 Astra', holderOnly: true, maxOutputTokens: 1100 },
  'claude-sonnet': { modelId: 'anthropic/claude-sonnet-5.5', name: 'Claude Sonnet 5.5', holderOnly: true, maxOutputTokens: 900 },
  'claude-opus': { modelId: 'anthropic/claude-opus-5.5', name: 'Claude Opus 5.5', holderOnly: true, maxOutputTokens: 1000 },
  'gemini-flash': { modelId: 'google/gemini-3.8-flash', name: 'Gemini 3.8 Flash', holderOnly: false, maxOutputTokens: 800 },
  'gemini-pro': { modelId: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', holderOnly: true, maxOutputTokens: 900 },
  grok: { modelId: 'x-ai/grok-4.7', name: 'Grok 4.7', holderOnly: true, maxOutputTokens: 900 },
  'groq-fast': { modelId: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', holderOnly: false, maxOutputTokens: 800 },
  'groq-deep': { modelId: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', holderOnly: true, maxOutputTokens: 850 },
  'deepseek-flash': { modelId: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', holderOnly: false, maxOutputTokens: 800 },
  'mistral-small': { modelId: 'mistralai/mistral-small-2603', name: 'Mistral Small', holderOnly: false, maxOutputTokens: 800 },
  'mistral-large': { modelId: 'mistralai/mistral-large-4-0', name: 'Mistral Large', holderOnly: true, maxOutputTokens: 900 },
};

export const RELAY_MODEL_SERVICES: ExternalMarketService[] = Object.entries(RELAY_MODELS).map(([cityId, route]) =>
  ({ id: `relay-${cityId}`, name: route.name, provider: 'relay' as const,
    category: 'AI Models' as const, description: `Ask ${route.name} one focused question. Live USDG price before payment.`,
    input: 'prompt' as const, placeholder: 'What should this model do for you?', fixedModelId: route.modelId,
    maxOutputTokens: route.maxOutputTokens, holderOnly: route.holderOnly, replacesCityServiceId: cityId }));

// Each upstream route is constructed here, never from a caller-supplied URL.
// A listing is usable only when its live 402 quote offers USDG on Robinhood Chain.
export const EXTERNAL_MARKET_SERVICES: ExternalMarketService[] = [
  { id: 'model-network', name: 'Choose an AI model', provider: 'relay', category: 'AI Models',
    description: 'Choose a model and pay its live USDG quote per request. No provider account needed.', input: 'prompt',
    placeholder: 'What should this model do for you?', modelPicker: true },
  { id: 'metered-models', name: 'Choose an AI model', provider: 'agent402', category: 'AI Models',
    description: 'Choose an AI model and see its live USDG price before paying.', input: 'prompt',
    placeholder: 'Describe a task, article, code question or report.', modelPicker: true },
  ...RELAY_MODEL_SERVICES,
  { id: 'relay-long-form', name: 'Longform Desk', provider: 'relay', category: 'AI Models',
    description: 'Create a long article, report or guide in one model call, up to 6,000 output tokens.', input: 'prompt',
    placeholder: 'Describe the article, report or guide you need.', fixedModelId: 'openai/gpt-6-luna',
    maxOutputTokens: 6000, replacesCityServiceId: 'long-form' },
  { id: 'agent402-auto-chat', name: 'Quick AI answer', provider: 'agent402', category: 'AI Models',
    description: 'Ask a question without choosing a model. Pay for one answer.', input: 'prompt',
    placeholder: 'What should this model help you with?', docs: 'https://agent402.tools/tools/category/llm' },
  { id: 'agent402-search', name: 'Web Scout', provider: 'agent402', category: 'Search',
    description: 'Search the live web for current links and snippets.', input: 'query',
    placeholder: 'What should your agent find?', docs: 'https://agent402.tools/tools/search', replacesCityServiceId: 'web-scout' },
  { id: 'agent402-news', name: 'News Radar', provider: 'agent402', category: 'Search',
    description: 'Find recent news and source links on a topic.', input: 'query',
    placeholder: 'Which news topic should we check?', docs: 'https://agent402.tools/tools/category/web', replacesCityServiceId: 'news-radar' },
  { id: 'agent402-answer', name: 'Answer with Sources', provider: 'agent402', category: 'Research',
    description: 'Get a short answer grounded in live web results, with citations.', input: 'query',
    placeholder: 'What question should we research?', docs: 'https://agent402.tools/tools/answer' },
  { id: 'agent402-extract', name: 'Page Reader', provider: 'agent402', category: 'Web & Scraping',
    description: 'Extract the main article from one public page.', input: 'url',
    placeholder: 'https://example.com/article', docs: 'https://agent402.tools/tools/extract', replacesCityServiceId: 'page-reader' },
  { id: 'agent402-render', name: 'Read a Dynamic Page', provider: 'agent402', category: 'Web & Scraping',
    description: 'Render a JavaScript page in a browser and return its readable text.', input: 'url',
    placeholder: 'https://example.com/app', docs: 'https://agent402.tools/tools/render' },
  { id: 'agent402-pdf', name: 'Read a PDF', provider: 'agent402', category: 'Web & Scraping',
    description: 'Extract text and page details from one public PDF URL.', input: 'url',
    placeholder: 'https://example.com/report.pdf', docs: 'https://agent402.tools/tools/pdf' },
  { id: 'agent402-pdf-markdown', name: 'PDF to Markdown', provider: 'agent402', category: 'Documents',
    description: 'Turn a public text-based PDF into clean Markdown for reading or reuse. Scanned pages need OCR.',
    input: 'url', placeholder: 'https://example.com/report.pdf', docs: 'https://agent402.tools/tools/pdf-to-markdown' },
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
  { id: 'agent402-stock-quote', name: 'US Stock Close', provider: 'agent402', category: 'Market Data',
    description: 'See the latest end-of-day US stock quote. This is not a live intraday price.',
    input: 'symbol', placeholder: 'NVDA', docs: 'https://agent402.tools/tools/stock-quote' },
  { id: 'agent402-sec-filings', name: 'Company Filings', provider: 'agent402', category: 'Research',
    description: 'Find recent SEC filings and source links for one US-listed company.',
    input: 'symbol', placeholder: 'AAPL', docs: 'https://agent402.tools/tools/edgar-filings' },
  { id: 'agent402-crypto-price', name: 'Crypto Price', provider: 'agent402', category: 'Market Data',
    description: 'Get a current price and 24-hour market snapshot for one coin.',
    input: 'symbol', placeholder: 'BTC', docs: 'https://agent402.tools/tools/crypto-price' },
  { id: 'agent402-weather', name: 'Current Weather', provider: 'agent402', category: 'Weather',
    description: 'Get current weather for any latitude and longitude.',
    input: 'coordinates', placeholder: '48.8566, 2.3522', docs: 'https://agent402.tools/tools/weather-current' },
  { id: 'featured-flux-image', name: 'Generate an Image', provider: 'relay', category: 'Media',
    description: 'Create one image from a text prompt with FLUX Schnell. See the live USDG quote first.',
    input: 'prompt', placeholder: 'Describe the image you want', docs: 'https://meshgateway.co/marketplace/network/fal' },
  { id: 'featured-exa-search', name: 'Semantic Web Search', provider: 'relay', category: 'Search',
    description: 'Find relevant web pages with semantic search and source links.',
    input: 'query', placeholder: 'What should we research?', docs: 'https://meshgateway.co/marketplace/network/exa' },
  { id: 'featured-brave-search', name: 'Independent Web Search', provider: 'relay', category: 'Search',
    description: 'Search an independent web index for current pages and snippets.',
    input: 'query', placeholder: 'What should we find?', docs: 'https://meshgateway.co/marketplace/network/brave' },
  { id: 'featured-parallel-search', name: 'Research Search', provider: 'relay', category: 'Search',
    description: 'Search the web for sources suitable for research.',
    input: 'query', placeholder: 'Research question or topic', docs: 'https://meshgateway.co/marketplace/network/parallel' },
  { id: 'featured-firecrawl-scrape', name: 'Read a Web Page', provider: 'relay', category: 'Web & Scraping',
    description: 'Extract clean Markdown from one public page.',
    input: 'url', placeholder: 'https://example.org/article', docs: 'https://meshgateway.co/marketplace/network/firecrawl' },
  { id: 'featured-browserbase-fetch', name: 'Fetch a Dynamic Page', provider: 'relay', category: 'Web & Scraping',
    description: 'Fetch a public page through a managed browser service.',
    input: 'url', placeholder: 'https://example.org', docs: 'https://meshgateway.co/marketplace/network/browserbase' },
  { id: 'featured-diffbot-article', name: 'Extract an Article', provider: 'relay', category: 'Web & Scraping',
    description: 'Extract article text and structured metadata from a public URL.',
    input: 'url', placeholder: 'https://example.org/article', docs: 'https://meshgateway.co/marketplace/network/diffbot' },
  { id: 'featured-deepgram-analyze', name: 'Analyze Text', provider: 'relay', category: 'Research',
    description: 'Analyze supplied text for topics and sentiment.',
    input: 'prompt', placeholder: 'Paste the text to analyze', docs: 'https://meshgateway.co/marketplace/network/deepgram' },
  { id: 'featured-stock-quote', name: 'Live Stock Quote', provider: 'relay', category: 'Market Data',
    description: 'Look up the latest available stock quote through Alpha Vantage.',
    input: 'symbol', placeholder: 'AAPL', docs: 'https://meshgateway.co/marketplace/network/alphavantage' },
  { id: 'featured-coin-price', name: 'CoinGecko Price', provider: 'relay', category: 'Market Data',
    description: 'Look up a coin price in USD by CoinGecko ID, such as bitcoin.',
    input: 'query', placeholder: 'bitcoin', docs: 'https://meshgateway.co/marketplace/network/coingecko' },
  { id: 'featured-openweather', name: 'Global Current Weather', provider: 'relay', category: 'Weather',
    description: 'Check current weather at a latitude and longitude.',
    input: 'coordinates', placeholder: '40.4168, -3.7038', docs: 'https://meshgateway.co/marketplace/network/openweather' },
  { id: 'featured-wolfram-answer', name: 'Compute an Answer', provider: 'relay', category: 'Research',
    description: 'Ask a short math or factual question of a computational knowledge engine.',
    input: 'query', placeholder: 'What is 17% of 240?', docs: 'https://meshgateway.co/marketplace/network/wolframalpha' },
  { id: 'mesh-dex-price', name: 'DEX Token Price', provider: 'mesh', category: 'Market Data',
    description: 'Find the highest-volume stablecoin market for a token symbol or name and see its current price.',
    input: 'query', placeholder: 'ETH or PEPE', docs: 'https://meshgateway.co/marketplace/mesh-gecko' },
  { id: 'mesh-dex-pairs', name: 'DEX Pair Search', provider: 'mesh', category: 'Market Data',
    description: 'Compare live DEX pools across chains by price, liquidity and trading volume.',
    input: 'query', placeholder: 'Token name, symbol or address', docs: 'https://meshgateway.co/marketplace/mesh-gecko' },
  { id: 'mesh-dex-trending', name: 'Trending DEX Tokens', provider: 'mesh', category: 'Market Data',
    description: 'See ten currently boosted tokens with live price and liquidity data. This is not a recommendation.',
    input: 'none', placeholder: '', holderOnly: true, docs: 'https://meshgateway.co/marketplace/mesh-gecko' },
  { id: 'mesh-rwa-quote', name: 'Robinhood Asset Quote', provider: 'mesh', category: 'Market Data',
    description: 'Look up a verified tokenized stock or other real-world asset on Robinhood Chain.',
    input: 'symbol', placeholder: 'AAPL', docs: 'https://meshgateway.co/marketplace/mesh-rwa' },
  { id: 'mesh-stock-contract', name: 'Stock Token Details', provider: 'mesh', category: 'Market Data',
    description: 'Inspect a Robinhood Chain stock token contract, supply, holders and explorer link.',
    input: 'symbol', placeholder: 'AAPL', holderOnly: true, docs: 'https://meshgateway.co/marketplace/hood-stocks' },
  { id: 'mesh-hook-permissions', name: 'DEX Hook Permissions', provider: 'mesh', category: 'Market Data',
    description: 'Decode what a Uniswap v4 hook contract can do before an agent interacts with a pool.',
    input: 'address', placeholder: '0x… hook contract address', holderOnly: true,
    docs: 'https://meshgateway.co/marketplace/v4-hooks' },
  { id: 'mesh-paper-search', name: 'Research Papers', provider: 'mesh', category: 'Research',
    description: 'Search scholarly works and receive citation and open-access details.',
    input: 'query', placeholder: 'What topic are you researching?', docs: 'https://meshgateway.co/marketplace/scholar' },
  { id: 'mesh-citation-search', name: 'DOI & Citation Search', provider: 'mesh', category: 'Research',
    description: 'Find scholarly publication metadata, DOIs and journal details through Crossref.',
    input: 'query', placeholder: 'Paper title or research topic', docs: 'https://meshgateway.co/marketplace/crossref' },
  { id: 'mesh-wiki-search', name: 'Encyclopedia Search', provider: 'mesh', category: 'Research',
    description: 'Find English Wikipedia articles and excerpts for a research topic.',
    input: 'query', placeholder: 'Topic or place', docs: 'https://meshgateway.co/marketplace/wiki' },
  { id: 'mesh-hacker-news', name: 'Tech News Search', provider: 'mesh', category: 'Search',
    description: 'Find Hacker News stories about a company, technology or topic.',
    input: 'query', placeholder: 'AI agents', docs: 'https://meshgateway.co/marketplace/hacker-news' },
  { id: 'mesh-place-geocode', name: 'Find Place Coordinates', provider: 'mesh', category: 'Weather',
    description: 'Resolve a city or place name to coordinates, country and timezone.',
    input: 'query', placeholder: 'Madrid', docs: 'https://meshgateway.co/marketplace/weather' },
  { id: 'mesh-weather-forecast', name: 'Weather Forecast', provider: 'mesh', category: 'Weather',
    description: 'Get current temperature and wind plus the next three days for a coordinate.',
    input: 'coordinates', placeholder: '40.4168, -3.7038', docs: 'https://meshgateway.co/marketplace/weather' },
  { id: 'mesh-electricity-price', name: 'German Power Prices', provider: 'mesh', category: 'Energy & Climate',
    description: 'Read day-ahead hourly wholesale electricity prices for Germany, in EUR/MWh.',
    input: 'none', placeholder: '', docs: 'https://meshgateway.co/marketplace/awattar' },
  { id: 'mesh-renewable-share', name: 'Renewable Power Share', provider: 'mesh', category: 'Energy & Climate',
    description: 'Read Germany’s daily average share of electricity demand met by renewables.',
    input: 'none', placeholder: '', docs: 'https://meshgateway.co/marketplace/energy-charts' },
  { id: 'mesh-repo-search', name: 'Open Source Repo Search', provider: 'mesh', category: 'Developer',
    description: 'Search public GitHub repositories by topic and inspect stars, language and license.',
    input: 'query', placeholder: 'agent tools', docs: 'https://meshgateway.co/marketplace/github-public' },
  { id: 'imperium-momentum', name: 'Stock Momentum Signal', provider: 'imperium', category: 'Market Data',
    description: 'Read direction, strength and time horizon for one tokenized stock. Informational data only.',
    input: 'symbol', placeholder: 'AAPL', docs: 'https://meshgateway.co/marketplace/imperium-pulse' },
  { id: 'imperium-sentiment', name: 'Stock Sentiment Signal', provider: 'imperium', category: 'Market Data',
    description: 'Read aggregated sentiment for one tokenized stock. Informational data only.',
    input: 'symbol', placeholder: 'AAPL', docs: 'https://meshgateway.co/marketplace/imperium-pulse' },
  { id: 'imperium-regime', name: 'Stock Market Regime', provider: 'imperium', category: 'Market Data',
    description: 'See the current market-regime classification and supporting factors for one stock token.',
    input: 'symbol', placeholder: 'AAPL', docs: 'https://meshgateway.co/marketplace/imperium-pulse' },
  { id: 'imperium-fundamentals', name: 'Stock Fundamentals', provider: 'imperium', category: 'Market Data',
    description: 'Get a structured fundamentals report for one tokenized stock.',
    input: 'symbol', placeholder: 'AAPL', holderOnly: true, docs: 'https://meshgateway.co/marketplace/imperium-pulse' },
  { id: 'imperium-risk', name: 'Stock Risk Signal', provider: 'imperium', category: 'Market Data',
    description: 'Review a structured risk signal for one tokenized stock. It does not place a trade.',
    input: 'symbol', placeholder: 'AAPL', holderOnly: true, docs: 'https://meshgateway.co/marketplace/imperium-pulse' },
  { id: 'imperium-anomaly', name: 'Stock Activity Anomaly', provider: 'imperium', category: 'Market Data',
    description: 'Spot unusual activity or changing conditions for one tokenized stock.',
    input: 'symbol', placeholder: 'AAPL', holderOnly: true, docs: 'https://meshgateway.co/marketplace/imperium-pulse' },
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
  // This seller's gateway forwards its own x402 challenge, which names its origin.
  const imperiumSignal = serviceId.startsWith('imperium-') ? serviceId.slice('imperium-'.length) : '';
  if (['momentum', 'sentiment', 'regime', 'fundamentals', 'risk', 'anomaly'].includes(imperiumSignal)) {
    return requestUrl === `https://api.meshgateway.co/m/imperium-pulse/${imperiumSignal}` &&
      quotedUrl === `https://api.imperium-fi.com/v1/pulse/${imperiumSignal}`;
  }
  // These merchants sign a fixed route and omit the user's query from resource.url.
  if (['agent402-search', 'agent402-news', 'agent402-answer', 'agent402-stock-quote',
    'agent402-sec-filings', 'agent402-crypto-price', 'agent402-weather',
    'mesh-dex-price', 'mesh-dex-pairs', 'mesh-dex-trending', 'mesh-rwa-quote',
    'mesh-stock-contract', 'mesh-hook-permissions', 'mesh-paper-search',
    'mesh-citation-search', 'mesh-wiki-search', 'mesh-hacker-news',
    'mesh-place-geocode', 'mesh-weather-forecast', 'mesh-electricity-price',
    'mesh-renewable-share', 'mesh-repo-search'].includes(serviceId)) {
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
  if (input.length > (service.modelPicker || service.fixedModelId ? 4000 : 1000)) throw new Error('Keep this request shorter.');
  if (service.input !== 'none' && !input) throw new Error('Enter a request for this service.');
  const selectedModelId = service.fixedModelId || modelId;
  if ((service.modelPicker || service.fixedModelId) && (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:/-]{0,120}$/i.test(selectedModelId) || selectedModelId.includes('*'))) {
    throw new Error('Choose a model from the live catalog.');
  }
  if (service.input === 'symbol' && !/^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(input)) throw new Error('Enter a stock symbol such as NVDA.');
  if (service.input === 'coordinates') {
    const parts = input.split(',').map((part) => part.trim());
    if (parts.length !== 2 || parts.some((part) => !/^-?\d{1,3}(?:\.\d{1,6})?$/.test(part))
      || Math.abs(Number(parts[0])) > 90 || Math.abs(Number(parts[1])) > 180) {
      throw new Error('Enter latitude and longitude, for example 48.8566, 2.3522.');
    }
  }
  if (service.input === 'address' && !/^0x[0-9a-fA-F]{40}$/.test(input)) throw new Error('Enter one EVM address.');
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
  if (service.id === 'model-network' || (service.fixedModelId && service.provider === 'relay')) return { url: 'https://api.meshgateway.co/x/openrouter/v1/chat/completions', method: 'POST' as const,
    body: JSON.stringify({ model: selectedModelId, messages: [{ role: 'user', content: input }], max_tokens: service.maxOutputTokens || 2000, stream: false }) };
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
  if (service.id === 'agent402-pdf-markdown') return { url: 'https://agent402.tools/api/pdf-to-markdown', method: 'POST' as const,
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
  if (service.id === 'agent402-stock-quote') return { url: `https://agent402.tools/api/stock-quote?symbol=${encodeURIComponent(input.toUpperCase())}`, method: 'GET' as const, body: undefined };
  if (service.id === 'agent402-sec-filings') return { url: `https://agent402.tools/api/edgar-filings?ticker=${encodeURIComponent(input.toUpperCase())}&limit=10`, method: 'GET' as const, body: undefined };
  if (service.id === 'agent402-crypto-price') return { url: `https://agent402.tools/api/crypto-price?coins=${encodeURIComponent(input.toUpperCase())}&currency=usd`, method: 'GET' as const, body: undefined };
  if (service.id === 'agent402-weather') {
    const [lat, lon] = input.split(',').map((part) => Number(part.trim()));
    return { url: `https://agent402.tools/api/weather-current?lat=${lat}&lon=${lon}`, method: 'GET' as const, body: undefined };
  }
  const featured = 'https://api.meshgateway.co/x';
  if (service.id === 'featured-flux-image') return { url: `${featured}/fal/fal-ai/flux/schnell`, method: 'POST' as const,
    body: JSON.stringify({ prompt: input, image_size: 'square', num_images: 1 }) };
  if (service.id === 'featured-exa-search') return { url: `${featured}/exa/search`, method: 'POST' as const,
    body: JSON.stringify({ query: input, numResults: 5 }) };
  if (service.id === 'featured-brave-search') return { url: `${featured}/brave/brave/web-search`, method: 'POST' as const,
    body: JSON.stringify({ q: input }) };
  if (service.id === 'featured-parallel-search') return { url: `${featured}/parallel/api/search`, method: 'POST' as const,
    body: JSON.stringify({ query: input }) };
  if (service.id === 'featured-firecrawl-scrape') return { url: `${featured}/firecrawl/v1/scrape`, method: 'POST' as const,
    body: JSON.stringify({ url: input, formats: ['markdown'], onlyMainContent: true }) };
  if (service.id === 'featured-browserbase-fetch') return { url: `${featured}/browserbase/fetch`, method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'featured-diffbot-article') return { url: `${featured}/diffbot/diffbot/article`, method: 'POST' as const,
    body: JSON.stringify({ url: input }) };
  if (service.id === 'featured-deepgram-analyze') return { url: `${featured}/deepgram/deepgram/analyze`, method: 'POST' as const,
    body: JSON.stringify({ text: input }) };
  if (service.id === 'featured-stock-quote') return { url: `${featured}/alphavantage/alphavantage/global-quote`, method: 'POST' as const,
    body: JSON.stringify({ symbol: input.toUpperCase() }) };
  if (service.id === 'featured-coin-price') return { url: `${featured}/coingecko/coingecko/simple-price`, method: 'POST' as const,
    body: JSON.stringify({ ids: input.toLowerCase(), vs_currencies: 'usd' }) };
  if (service.id === 'featured-openweather') {
    const [lat, lon] = input.split(',').map((part) => Number(part.trim()));
    return { url: `${featured}/openweather/openweather/current-weather`, method: 'POST' as const,
      body: JSON.stringify({ lat, lon }) };
  }
  if (service.id === 'featured-wolfram-answer') return { url: `${featured}/wolframalpha/wolframalpha/short-answer`, method: 'POST' as const,
    body: JSON.stringify({ input }) };
  const mesh = 'https://api.meshgateway.co/m';
  if (service.id === 'mesh-dex-price') return { url: `${mesh}/mesh-gecko/price?q=${encodeURIComponent(input)}`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-dex-pairs') return { url: `${mesh}/mesh-gecko/search?q=${encodeURIComponent(input)}&limit=10`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-dex-trending') return { url: `${mesh}/mesh-gecko/trending?limit=10`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-rwa-quote') return { url: `${mesh}/mesh-rwa/quote?symbol=${encodeURIComponent(input.toUpperCase())}`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-stock-contract') return { url: `${mesh}/hood-stocks/token?symbol=${encodeURIComponent(input.toUpperCase())}`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-hook-permissions') return { url: `${mesh}/v4-hooks/permissions?address=${encodeURIComponent(input)}`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-paper-search') return { url: `${mesh}/scholar/search?search=${encodeURIComponent(input)}&per-page=5`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-citation-search') return { url: `${mesh}/crossref/works?query=${encodeURIComponent(input)}&rows=5`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-wiki-search') return { url: `${mesh}/wiki/search?q=${encodeURIComponent(input)}&limit=5`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-hacker-news') return { url: `${mesh}/hacker-news/search?query=${encodeURIComponent(input)}&tags=story&hitsPerPage=10`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-place-geocode') return { url: `${mesh}/weather/geocode?name=${encodeURIComponent(input)}&count=5`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-weather-forecast') {
    const [lat, lon] = input.split(',').map((part) => Number(part.trim()));
    return { url: `${mesh}/weather/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=3&timezone=auto`, method: 'GET' as const, body: undefined };
  }
  if (service.id === 'mesh-electricity-price') return { url: `${mesh}/awattar/de`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-renewable-share') return { url: `${mesh}/energy-charts/ren-share?country=de`, method: 'GET' as const, body: undefined };
  if (service.id === 'mesh-repo-search') return { url: `${mesh}/github-public/search?q=${encodeURIComponent(input)}&per_page=5`, method: 'GET' as const, body: undefined };
  if (service.provider === 'imperium') {
    const signal = service.id.slice('imperium-'.length);
    if (['momentum', 'sentiment', 'regime', 'fundamentals', 'risk', 'anomaly'].includes(signal)) {
      return { url: `${mesh}/imperium-pulse/${signal}`, method: 'POST' as const,
        body: JSON.stringify({ symbol: input.toUpperCase() }) };
    }
  }
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
