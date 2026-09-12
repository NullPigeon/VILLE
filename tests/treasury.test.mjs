import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { creatorRewardWei, treasuryProposalPasses, TREASURY_VOTING_HOURS } from '../lib/treasury.ts';

void test('creator reward is one percent until it reaches the 0.005 ETH cap', () => {
  assert.equal(creatorRewardWei(0n), 0n);
  assert.equal(creatorRewardWei(100_000_000_000_000_000n), 1_000_000_000_000_000n);
  assert.equal(creatorRewardWei(500_000_000_000_000_000n), 5_000_000_000_000_000n);
  assert.equal(creatorRewardWei(100_000_000_000_000_000_000n), 5_000_000_000_000_000n);
});

void test('treasury voting lasts 48 hours and has no quorum', () => {
  assert.equal(TREASURY_VOTING_HOURS, 48);
  assert.equal(treasuryProposalPasses(0, 0), false);
  assert.equal(treasuryProposalPasses(1, 1), false);
  assert.equal(treasuryProposalPasses(1, 0), true);
  assert.equal(treasuryProposalPasses(101, 100), true);
});

void test('treasury signing stays server-only and behind worker authorization', () => {
  const signer = readFileSync(new URL('../lib/server/treasury.ts', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../app/api/internal/treasury-rewards/route.ts', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../app/treasury/page.tsx', import.meta.url), 'utf8');
  assert.match(signer, /^import 'server-only';/);
  assert.match(signer, /VERCEL_ENV !== 'production'/);
  assert.match(route, /requireWorker\(request\)[\s\S]*payNextCreatorReward/);
  assert.doesNotMatch(route, /SCRAPY_TREASURY_PRIVATE_KEY/);
  assert.doesNotMatch(client, /SCRAPY_TREASURY_PRIVATE_KEY|privateKeyToAccount/);
});
