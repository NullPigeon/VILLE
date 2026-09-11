import assert from 'node:assert/strict';
import test from 'node:test';
import { creatorRewardWei, treasuryProposalPasses, TREASURY_VOTING_HOURS } from '../lib/treasury.ts';

void test('creator reward is one percent until it reaches the 0.05 ETH cap', () => {
  assert.equal(creatorRewardWei(0n), 0n);
  assert.equal(creatorRewardWei(1_000_000_000_000_000_000n), 10_000_000_000_000_000n);
  assert.equal(creatorRewardWei(5_000_000_000_000_000_000n), 50_000_000_000_000_000n);
  assert.equal(creatorRewardWei(100_000_000_000_000_000_000n), 50_000_000_000_000_000n);
});

void test('treasury voting lasts 48 hours and has no quorum', () => {
  assert.equal(TREASURY_VOTING_HOURS, 48);
  assert.equal(treasuryProposalPasses(0, 0), false);
  assert.equal(treasuryProposalPasses(1, 1), false);
  assert.equal(treasuryProposalPasses(1, 0), true);
  assert.equal(treasuryProposalPasses(101, 100), true);
});
