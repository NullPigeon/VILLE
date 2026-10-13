import assert from 'node:assert/strict';
import test from 'node:test';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, HOLDER_SLOT_LIMIT, DEFAULT_AGENT_SKILLS, MARKET_NETWORK, MARKET_HOLDER_MINIMUM, availableAgentSkills, hasMarketHolderBalance, validateAgentSkills } from '../lib/agent-market.ts';
import { MARKET_SERVICES, marketService } from '../lib/market-services.ts';
import { EXTERNAL_MARKET_SERVICES, RELAY_MODEL_SERVICES, externalMarketRequest, externalMarketService, externalModelHolderOnly, externalResourceMatches } from '../lib/external-market.ts';

void test('nonholders can equip at most three distinct basic skills', () => {
  assert.deepEqual(validateAgentSkills(DEFAULT_AGENT_SKILLS), DEFAULT_AGENT_SKILLS);
  assert.deepEqual(validateAgentSkills([]), []);
  assert.throws(() => validateAgentSkills(AGENT_SKILLS.map((skill) => skill.id)));
  assert.throws(() => validateAgentSkills(['city-guide', 'city-guide']));
  assert.throws(() => validateAgentSkills(['deep-planner']));
  assert.throws(() => validateAgentSkills(['city-architect']));
  assert.equal(BASIC_SLOT_LIMIT, 3);
});

void test('verified holders can equip six specialist skills without auto-enabling every skill', () => {
  assert.deepEqual(availableAgentSkills(false, ['city-guide']), ['city-guide']);
  assert.deepEqual(availableAgentSkills(false, ['city-architect']), []);
  assert.deepEqual(availableAgentSkills(true, ['city-guide']), ['city-guide']);
  assert.deepEqual(validateAgentSkills(['city-guide', 'city-architect'], true), ['city-guide', 'city-architect']);
  assert.throws(() => validateAgentSkills(AGENT_SKILLS.slice(0, 7).map((skill) => skill.id), true));
  assert.equal(HOLDER_SLOT_LIMIT, 6);
  assert.equal(MARKET_NETWORK, 'eip155:4663');
  assert.equal(MARKET_HOLDER_MINIMUM, 1_000_000n * 10n ** 18n);
  assert.equal(hasMarketHolderBalance(MARKET_HOLDER_MINIMUM - 1n), false);
  assert.equal(hasMarketHolderBalance(MARKET_HOLDER_MINIMUM), true);
});

void test('paid catalogue has unique bounded listings and distinct live tools', () => {
  assert.equal(MARKET_SERVICES.length, 20);
  assert.equal(new Set(MARKET_SERVICES.map((service) => service.id)).size, MARKET_SERVICES.length);
  for (const service of MARKET_SERVICES) {
    assert.match(service.id, /^[a-z0-9-]+$/);
    assert.equal(marketService(service.id), service);
    assert.ok(Number(service.priceUsd) > 0 && Number(service.priceUsd) <= 2);
    assert.match(service.priceUsd, /^\d+\.\d{1,6}$/);
    if (service.kind === 'model') assert.ok(service.model && service.maxOutputTokens);
  }
  assert.deepEqual(new Set(MARKET_SERVICES.filter((service) => service.kind !== 'model').map((service) => service.kind)),
    new Set(['world-audit', 'web-search', 'web-news', 'web-scrape', 'research-brief', 'chain-lens', 'long-form']));
});

void test('outside model calls use fixed upstream routes and require a selected model', () => {
  const network = externalMarketService('model-network');
  const metered = externalMarketService('metered-models');
  assert.ok(network && metered);
  assert.throws(() => externalMarketRequest(network, 'Write a report'));
  assert.throws(() => externalMarketRequest(metered, 'Write a report', 'openai/*'));
  const first = externalMarketRequest(network, 'Write a report', 'openai/gpt-4o-mini');
  const second = externalMarketRequest(metered, 'Write a report', 'openai/gpt-4o-mini');
  assert.equal(new URL(first.url).hostname, 'api.meshgateway.co');
  assert.equal(new URL(second.url).hostname, 'agent402.tools');
  assert.equal(JSON.parse(first.body).model, 'openai/gpt-4o-mini');
  assert.equal(JSON.parse(second.body).messages[0].content, 'Write a report');
});

void test('advanced direct models require verified SCRAPY holder access', () => {
  assert.equal(externalModelHolderOnly('anthropic/claude-opus-4'), true);
  assert.equal(externalModelHolderOnly('openai/gpt-6-sol'), true);
  assert.equal(externalModelHolderOnly('google/gemini-2.5-pro'), true);
  assert.equal(externalModelHolderOnly('openai/o3'), true);
  assert.equal(externalModelHolderOnly('openai/gpt-5-nano'), false);
  assert.equal(externalModelHolderOnly('openai/gpt-6-luna'), false);
  assert.equal(externalModelHolderOnly('openai/gpt-4o-mini'), false);
  assert.equal(externalModelHolderOnly('anthropic/claude-sonnet-4'), false);
});

void test('existing model cards resolve to fixed x402 routes without city API keys', () => {
  assert.equal(RELAY_MODEL_SERVICES.length, MARKET_SERVICES.filter((service) => service.kind === 'model').length);
  assert.equal(new Set(EXTERNAL_MARKET_SERVICES.map((service) => service.id)).size, EXTERNAL_MARKET_SERVICES.length);
  for (const service of RELAY_MODEL_SERVICES) {
    const city = MARKET_SERVICES.find((item) => item.id === service.replacesCityServiceId);
    assert.ok(city);
    assert.equal(service.holderOnly, city.holderOnly);
    const request = externalMarketRequest(service, 'Write a short answer');
    assert.equal(new URL(request.url).hostname, 'api.meshgateway.co');
    assert.equal(JSON.parse(request.body).model, service.fixedModelId);
  }
  const longform = externalMarketService('relay-long-form');
  assert.ok(longform);
  assert.equal(JSON.parse(externalMarketRequest(longform, 'Write a report').body).max_tokens, 6000);
});

void test('new Mesh listings use fixed Robinhood USDG routes and bind quotes to the route', () => {
  const examples = {
    'mesh-dex-price': 'ETH', 'mesh-dex-pairs': 'ETH', 'mesh-dex-trending': '',
    'mesh-rwa-quote': 'AAPL', 'mesh-stock-contract': 'AAPL',
    'mesh-hook-permissions': '0x0000000000000000000000000000000000000000',
    'mesh-paper-search': 'AI agents', 'mesh-citation-search': 'AI agents',
    'mesh-wiki-search': 'AI agents', 'mesh-hacker-news': 'AI agents',
    'mesh-place-geocode': 'Madrid', 'mesh-weather-forecast': '40.4168, -3.7038',
    'mesh-electricity-price': '', 'mesh-renewable-share': '', 'mesh-repo-search': 'agent tools',
  };
  for (const [id, input] of Object.entries(examples)) {
    const service = externalMarketService(id);
    assert.ok(service);
    assert.equal(service.provider, 'mesh');
    const request = externalMarketRequest(service, input);
    const url = new URL(request.url);
    assert.equal(url.hostname, 'api.meshgateway.co');
    assert.equal(request.method, 'GET');
    assert.equal(externalResourceMatches(id, `${url.origin}${url.pathname}`, request.url), true);
    assert.equal(externalResourceMatches(id, `${url.origin}/m/other/route`, request.url), false);
    assert.equal(externalResourceMatches(id, `https://attacker.example${url.pathname}`, request.url), false);
  }
  assert.throws(() => externalMarketRequest(externalMarketService('mesh-hook-permissions'), 'not-an-address'));
  assert.throws(() => externalMarketRequest(externalMarketService('mesh-weather-forecast'), '999, 999'));
});

void test('featured merchant routes pin a single paid operation and validate its input', () => {
  const examples = {
    'featured-flux-image': 'A friendly robot',
    'featured-exa-search': 'AI agents',
    'featured-brave-search': 'AI agents',
    'featured-parallel-search': 'AI agents',
    'featured-firecrawl-scrape': 'https://example.org/article',
    'featured-browserbase-fetch': 'https://example.org',
    'featured-diffbot-article': 'https://example.org/article',
    'featured-deepgram-analyze': 'This robot is helpful.',
    'featured-stock-quote': 'AAPL',
    'featured-coin-price': 'bitcoin',
    'featured-openweather': '40.4168, -3.7038',
    'featured-wolfram-answer': '2+2',
  };
  for (const [id, input] of Object.entries(examples)) {
    const service = externalMarketService(id);
    assert.ok(service);
    const request = externalMarketRequest(service, input);
    assert.equal(request.method, 'POST');
    assert.match(request.url, /^https:\/\/api\.meshgateway\.co\/x\/[-a-z0-9/]+$/);
    assert.equal(externalResourceMatches(id, request.url, request.url), true);
    assert.equal(externalResourceMatches(id, request.url + '/other', request.url), false);
    assert.ok(JSON.parse(request.body));
  }
  assert.throws(() => externalMarketRequest(externalMarketService('featured-firecrawl-scrape'), 'http://localhost'));
  assert.throws(() => externalMarketRequest(externalMarketService('featured-openweather'), '999, 999'));
  assert.throws(() => externalMarketRequest(externalMarketService('featured-stock-quote'), '../secret'));
});

void test('independent seller signals bind their original x402 resource to the gateway route', () => {
  for (const signal of ['momentum', 'sentiment', 'regime', 'fundamentals', 'risk', 'anomaly']) {
    const id = `imperium-${signal}`;
    const service = externalMarketService(id);
    assert.ok(service);
    const request = externalMarketRequest(service, 'aapl');
    assert.equal(request.url, `https://api.meshgateway.co/m/imperium-pulse/${signal}`);
    assert.equal(request.method, 'POST');
    assert.equal(JSON.parse(request.body).symbol, 'AAPL');
    assert.equal(externalResourceMatches(id, `https://api.imperium-fi.com/v1/pulse/${signal}`, request.url), true);
    assert.equal(externalResourceMatches(id, 'https://api.imperium-fi.com/v1/pulse/risk?extra=1', request.url), false);
    assert.equal(externalResourceMatches(id, 'https://attacker.example/v1/pulse/momentum', request.url), false);
  }
});
