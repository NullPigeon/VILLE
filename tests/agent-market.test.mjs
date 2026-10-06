import assert from 'node:assert/strict';
import test from 'node:test';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, DEFAULT_AGENT_SKILLS, MARKET_NETWORK, availableAgentSkills, validateAgentSkills } from '../lib/agent-market.ts';

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
