import assert from 'node:assert/strict';
import test from 'node:test';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, DEFAULT_AGENT_SKILLS, MARKET_NETWORK, MARKET_HOLDER_MINIMUM, availableAgentSkills, hasMarketHolderBalance, validateAgentSkills } from '../lib/agent-market.ts';
import { MARKET_SERVICES, marketService } from '../lib/market-services.ts';
import { externalMarketRequest, externalMarketService, externalModelHolderOnly } from '../lib/external-market.ts';

void test('nonholders can equip at most three distinct basic skills', () => {
  assert.deepEqual(validateAgentSkills(DEFAULT_AGENT_SKILLS), DEFAULT_AGENT_SKILLS);
  assert.deepEqual(validateAgentSkills([]), []);
  assert.throws(() => validateAgentSkills(AGENT_SKILLS.map((skill) => skill.id)));
  assert.throws(() => validateAgentSkills(['city-guide', 'city-guide']));
  assert.throws(() => validateAgentSkills(['deep-planner']));
  assert.equal(BASIC_SLOT_LIMIT, 3);
});

void test('verified holder access covers all live skills and stays on Robinhood Chain', () => {
  assert.deepEqual(availableAgentSkills(false, ['city-guide']), ['city-guide']);
  assert.deepEqual(availableAgentSkills(true, ['city-guide']), AGENT_SKILLS.map((skill) => skill.id));
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
