import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateVoteWeight } from '../lib/governance.ts';

const cases = [
  [0n, 1],
  [1n, 1],
  [249_999n, 1],
  [250_000n, 2],
  [250_001n, 2],
  [499_999n, 2],
  [500_000n, 3],
  [1_000_000n, 5],
];

for (const decimals of [0, 6, 18]) {
  const unit = 10n ** BigInt(decimals);
  for (const [tokens, expected] of cases) {
    void test(`${tokens} SCRAPY (${decimals} decimals) gives ${expected} votes`, () => {
      assert.equal(calculateVoteWeight(tokens * unit, decimals), expected);
    });
  }

  for (const [threshold, weight] of [[250_000n, 2], [500_000n, 3], [1_000_000n, 5]]) {
    void test(`one smallest unit below ${threshold} SCRAPY (${decimals} decimals) does not round up`, () => {
      assert.equal(calculateVoteWeight(threshold * unit - 1n, decimals), weight - 1);
    });
  }
}
