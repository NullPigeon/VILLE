import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTokenAmount, SCRAPY_TOKEN, SCRAPY_TOKEN_ADDRESS_LOWER, scrapyAccess } from '../lib/scrapy-token.ts';
import { TOKENS_PER_VOTE } from '../lib/governance.ts';

void test('official SCRAPY contract is pinned to Robinhood mainnet', () => {
  assert.equal(SCRAPY_TOKEN.address, '0xf7CdBd39720Ea583ec56e3a9ff57E805e93e7BBe');
  assert.equal(SCRAPY_TOKEN_ADDRESS_LOWER, '0xf7cdbd39720ea583ec56e3a9ff57e805e93e7bbe');
  assert.equal(SCRAPY_TOKEN.chainId, 4663);
  assert.equal(SCRAPY_TOKEN.symbol, 'SCRAPY');
  assert.equal(SCRAPY_TOKEN.onchainName, 'LANDVILLE');
  assert.equal(SCRAPY_TOKEN.decimals, 18);
  assert.equal(SCRAPY_TOKEN.tokensPerVote, TOKENS_PER_VOTE);
});

void test('large token values format without unsafe Number conversion', () => {
  assert.equal(formatTokenAmount('1000000000000000000000000000', 18, 0), '1,000,000,000');
  assert.equal(formatTokenAmount('250000125000000000000000', 18, 2), '250,000.12');
  assert.equal(formatTokenAmount('1', 18, 2), '0');
});

void test('zero-token citizens retain base access', () => {
  assert.deepEqual(scrapyAccess(0n), { holder: false, buildEligible: false, dailyMessageLimit: 10 });
});

void test('a positive balance unlocks holder messages but not a build request', () => {
  assert.deepEqual(scrapyAccess(1n), { holder: true, buildEligible: false, dailyMessageLimit: 50 });
});

void test('250,000 SCRAPY unlocks build requests', () => {
  assert.deepEqual(scrapyAccess(250_000n * 10n ** 18n), { holder: true, buildEligible: true, dailyMessageLimit: 50 });
});
