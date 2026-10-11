import assert from 'node:assert/strict';
import test from 'node:test';
import { jobPromptHash, receiptMatchesJob } from '../lib/agent-job-receipt.ts';

void test('a paid citizen offer only closes the exact posted brief and stall', () => {
  const service = 'stall:11111111-1111-4111-8111-111111111111';
  const brief = 'Write a sourced report on the Market district.';
  const order = { service_id: service, prompt_hash: jobPromptHash(service, brief) };
  assert.equal(receiptMatchesJob(order, service, brief), true);
  assert.equal(receiptMatchesJob(order, service, 'Write a different report.'), false);
  assert.equal(receiptMatchesJob(order, 'stall:22222222-2222-4222-8222-222222222222', brief), false);
});

void test('model-picker receipts bind the selected model and exact prompt', () => {
  const service = 'external:model-network';
  const brief = 'Draft a planning memo for the city economy.';
  const order = { service_id: service, prompt_hash: jobPromptHash(service, brief, 'openai/gpt-4o-mini') };
  assert.equal(receiptMatchesJob(order, service, brief, 'openai/gpt-4o-mini'), true);
  assert.equal(receiptMatchesJob(order, service, brief, 'anthropic/claude-sonnet-4'), false);
  assert.equal(receiptMatchesJob(order, service, brief), false);
});

void test('city and direct merchant receipts use their own checkout formats', () => {
  const brief = 'Find current links about LANDVILLE.';
  const city = { service_id: 'web-scout', prompt_hash: jobPromptHash('web-scout', brief) };
  const merchant = { service_id: 'external:agent402-search', prompt_hash: jobPromptHash('external:agent402-search', brief) };
  assert.equal(receiptMatchesJob(city, 'web-scout', brief), true);
  assert.equal(receiptMatchesJob(merchant, 'external:agent402-search', brief), true);
  assert.equal(receiptMatchesJob(merchant, 'web-scout', brief), false);
});
