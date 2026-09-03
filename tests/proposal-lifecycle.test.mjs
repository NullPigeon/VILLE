import assert from 'node:assert/strict';
import test from 'node:test';
import { activeProposalForWallet, getBuildQueue, hasWinningVote, nextBuildId, VOTING_HOURS } from '../lib/proposal-lifecycle.ts';

const wallet = `0x${'a'.repeat(40)}`;
const other = `0x${'b'.repeat(40)}`;
const now = Date.parse('2026-09-03T12:00:00Z');
const proposal = (id, status = 'LIVE', offset = -1000, yes = 2, no = 1) => ({ id, status, creatorWallet: wallet, yes, no, closesAt: new Date(now + offset).toISOString() });

void test('each proposal gets an independent 12-hour window', () => assert.equal(VOTING_HOURS, 12));
for (const status of ['LIVE', 'PASSED', 'BUILDING']) {
  void test(`${status} blocks another request, regardless of its age`, () => {
    const record = { ...proposal('LV-1', status), createdAt: '2025-01-01' };
    assert.equal(activeProposalForWallet([record], wallet), record);
    assert.equal(activeProposalForWallet([record], wallet.toUpperCase()), record);
    assert.equal(activeProposalForWallet([record], other), undefined);
    assert.equal(activeProposalForWallet([record], ''), undefined);
  });
}
for (const status of ['REJECTED', 'BUILT']) {
  void test(`${status} releases the citizen's slot immediately`, () => assert.equal(activeProposalForWallet([proposal('LV-1', status)], wallet), undefined));
}
for (const [yes, no, passed] of [[0,0,false],[1,1,false],[1,2,false],[1,0,true],[101,100,true]]) {
  void test(`${yes} YES / ${no} NO ${passed ? 'passes' : 'fails'} without a quorum or rounded percentage`, () => assert.equal(hasWinningVote({ yes, no }), passed));
}
void test('multiple approved proposals queue by deadline, not number of votes', () => {
  const records = [proposal('LV-3', 'PASSED', -1000, 100), proposal('LV-1', 'PASSED', -3000), proposal('LV-2', 'PASSED', -2000)];
  assert.deepEqual(getBuildQueue(records, now).map((item) => item.id), ['LV-1','LV-2','LV-3']);
  assert.equal(nextBuildId(records, now), 'LV-1');
  assert.deepEqual(records.map((item) => item.id), ['LV-3','LV-1','LV-2'], 'does not mutate shared state');
});
void test('only one build can run; releasing it makes the next available', () => {
  const records = [proposal('LV-1', 'BUILDING', -3000), proposal('LV-2', 'PASSED', -2000)];
  assert.equal(nextBuildId(records, now), undefined);
  records[0].status = 'BUILT';
  assert.equal(nextBuildId(records, now), 'LV-2');
});
void test('an earlier winner awaiting finalization cannot be skipped', () => {
  const records = [proposal('LV-2', 'PASSED', -1000), proposal('LV-1', 'LIVE', -2000)];
  assert.equal(nextBuildId(records, now), undefined);
  assert.deepEqual(getBuildQueue(records, now).map((item) => item.id), ['LV-1','LV-2']);
});
void test('ongoing votes, ties, no-vote results and rejected/built proposals do not enter the waiting queue', () => {
  const records = [proposal('LV-1', 'LIVE', 1000), proposal('LV-2', 'LIVE', -1000, 1, 1), proposal('LV-3', 'LIVE', -1000, 0, 0), proposal('LV-4', 'REJECTED'), proposal('LV-5', 'BUILT')];
  assert.deepEqual(getBuildQueue(records, now), []);
});
void test('equal deadlines have a stable proposal-ID tie break matching SQL text ordering', () => {
  assert.deepEqual(getBuildQueue([proposal('LV-2', 'PASSED'), proposal('LV-10', 'PASSED')], now).map((item) => item.id), ['LV-10','LV-2']);
});
