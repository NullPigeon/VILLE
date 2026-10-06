import assert from 'node:assert/strict';
import test from 'node:test';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, DEFAULT_AGENT_SKILLS, MARKET_NETWORK, availableAgentSkills, validateAgentSkills } from '../lib/agent-market.ts';
import { MARKET_SERVICES, marketService } from '../lib/market-services.ts';

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
});

void test('paid catalogue has unique bounded listings and distinct live tools', () => {
  assert.equal(MARKET_SERVICES.length, 16);
  assert.equal(new Set(MARKET_SERVICES.map((service) => service.id)).size, MARKET_SERVICES.length);
  for (const service of MARKET_SERVICES) {
    assert.match(service.id, /^[a-z0-9-]+$/);
    assert.equal(marketService(service.id), service);
    assert.ok(Number(service.priceUsd) > 0 && Number(service.priceUsd) <= 2);
    assert.match(service.priceUsd, /^\d+\.\d{1,6}$/);
    if (service.kind === 'model') assert.ok(service.model && service.maxOutputTokens);
  }
  assert.deepEqual(new Set(MARKET_SERVICES.filter((service) => service.kind !== 'model').map((service) => service.kind)),
    new Set(['world-audit', 'web-search', 'chain-lens']));
});
