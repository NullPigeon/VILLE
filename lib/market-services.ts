export type MarketProvider = 'landville' | 'openai' | 'anthropic' | 'google' | 'xai' | 'groq' | 'deepseek' | 'mistral' | 'brave' | 'robinhood';
export type YardMarketSuggestion = { serviceId: string; name: string; priceUsd: string; prompt: string };
export type MarketServiceKind = 'world-audit' | 'web-search' | 'web-news' | 'research-brief' | 'chain-lens' | 'model' | 'long-form';
export type MarketService = {
  id: string;
  name: string;
  category: 'City' | 'Search' | 'Research' | 'Blockchain' | 'AI Models';
  provider: MarketProvider;
  kind: MarketServiceKind;
  model?: string;
  priceUsd: string;
  description: string;
  holderOnly: boolean;
  maxOutputTokens?: number;
};

// Prices are retail USDG per bounded call, not claims about provider rates.
// Operations explicitly enable each ID after checking provider access and cost.
export const MARKET_SERVICES: MarketService[] = [
  { id: 'world-audit', name: 'World Audit', category: 'City', provider: 'landville', kind: 'world-audit', priceUsd: '0.03', description: 'Analyze real World buildings and proposals to find one useful gap in a district.', holderOnly: false, maxOutputTokens: 700 },
  { id: 'web-scout', name: 'Web Scout', category: 'Search', provider: 'brave', kind: 'web-search', priceUsd: '0.02', description: 'Search the live web and return five source links with short summaries.', holderOnly: false },
  { id: 'news-radar', name: 'News Radar', category: 'Search', provider: 'brave', kind: 'web-news', priceUsd: '0.02', description: 'Find recent news on a topic with source links and dates.', holderOnly: false },
  { id: 'research-brief', name: 'Research Brief', category: 'Research', provider: 'landville', kind: 'research-brief', priceUsd: '0.12', description: 'Search live sources and write a sourced brief. Up to 2,500 output tokens.', holderOnly: false, maxOutputTokens: 2500 },
  { id: 'chain-lens', name: 'Chain Lens', category: 'Blockchain', provider: 'robinhood', kind: 'chain-lens', priceUsd: '0.01', description: 'Read current SCRAPY and ETH balances for an EVM address on Robinhood Chain.', holderOnly: false },
  { id: 'long-form', name: 'Longform Desk', category: 'AI Models', provider: 'openai', kind: 'long-form', priceUsd: '0.18', description: 'Create a detailed article, report or guide from your brief. One bounded request, up to 6,000 output tokens.', holderOnly: false, maxOutputTokens: 6000 },
  { id: 'openai-luna', name: 'GPT-6 Luna', category: 'AI Models', provider: 'openai', kind: 'model', model: 'gpt-6-luna', priceUsd: '0.01', description: 'Fast OpenAI text reasoning for a bounded task.', holderOnly: false, maxOutputTokens: 800 },
  { id: 'openai-sol', name: 'GPT-6.1 Sol', category: 'AI Models', provider: 'openai', kind: 'model', model: 'gpt-6.1-sol', priceUsd: '0.04', description: 'Deeper OpenAI reasoning for code, planning and analysis.', holderOnly: true, maxOutputTokens: 1000 },
  { id: 'openai-astra', name: 'GPT-6 Astra', category: 'AI Models', provider: 'openai', kind: 'model', model: 'gpt-6-astra', priceUsd: '0.15', description: 'Frontier OpenAI reasoning for demanding one-off tasks.', holderOnly: true, maxOutputTokens: 1100 },
  { id: 'claude-sonnet', name: 'Claude Sonnet 5.5', category: 'AI Models', provider: 'anthropic', kind: 'model', model: 'claude-sonnet-5-5', priceUsd: '0.06', description: 'Claude for detailed writing, code and analysis.', holderOnly: true, maxOutputTokens: 900 },
  { id: 'claude-opus', name: 'Claude Opus 5.5', category: 'AI Models', provider: 'anthropic', kind: 'model', model: 'claude-opus-5-5', priceUsd: '0.20', description: 'Claude frontier reasoning for complex work.', holderOnly: true, maxOutputTokens: 1000 },
  { id: 'gemini-flash', name: 'Gemini 3.8 Flash', category: 'AI Models', provider: 'google', kind: 'model', model: 'gemini-3.8-flash', priceUsd: '0.02', description: 'Fast Gemini text output for focused tasks.', holderOnly: false, maxOutputTokens: 800 },
  { id: 'gemini-pro', name: 'Gemini 3.1 Pro', category: 'AI Models', provider: 'google', kind: 'model', model: 'gemini-3.1-pro-preview', priceUsd: '0.08', description: 'Gemini Pro reasoning for demanding prompts. Preview model.', holderOnly: true, maxOutputTokens: 900 },
  { id: 'grok', name: 'Grok 4.7', category: 'AI Models', provider: 'xai', kind: 'model', model: 'grok-4.7', priceUsd: '0.05', description: 'xAI text model for code and knowledge work.', holderOnly: true, maxOutputTokens: 900 },
  { id: 'groq-fast', name: 'GPT-OSS 20B on Groq', category: 'AI Models', provider: 'groq', kind: 'model', model: 'openai/gpt-oss-20b', priceUsd: '0.01', description: 'Fast open-weight inference on Groq.', holderOnly: false, maxOutputTokens: 800 },
  { id: 'groq-deep', name: 'GPT-OSS 120B on Groq', category: 'AI Models', provider: 'groq', kind: 'model', model: 'openai/gpt-oss-120b', priceUsd: '0.03', description: 'Larger open-weight model on Groq.', holderOnly: true, maxOutputTokens: 850 },
  { id: 'deepseek-flash', name: 'DeepSeek Flash', category: 'AI Models', provider: 'deepseek', kind: 'model', model: 'deepseek-flash', priceUsd: '0.01', description: 'Efficient DeepSeek text model.', holderOnly: false, maxOutputTokens: 800 },
  { id: 'mistral-small', name: 'Mistral Small', category: 'AI Models', provider: 'mistral', kind: 'model', model: 'mistral-small-latest', priceUsd: '0.01', description: 'Fast Mistral text model.', holderOnly: false, maxOutputTokens: 800 },
  { id: 'mistral-large', name: 'Mistral Large', category: 'AI Models', provider: 'mistral', kind: 'model', model: 'mistral-large-latest', priceUsd: '0.05', description: 'More capable Mistral text model.', holderOnly: true, maxOutputTokens: 900 },
];

export function marketService(id: string) {
  return MARKET_SERVICES.find((service) => service.id === id);
}
