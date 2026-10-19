import assert from 'node:assert/strict';
import test from 'node:test';
import { validateMissionChoice } from '../lib/agent-mission-choice.ts';

const jobs = [{ id: 'job-a', client_wallet: 'buyer' }, { id: 'job-b', client_wallet: 'owner' }];
const stalls = [{ id: 'stall-a' }];

void test('robot may recommend only a public candidate paired with the owner’s eligible service', () => {
  const selected = validateMissionChoice({ jobId: 'job-a', stallId: 'stall-a', reason: 'Suitable research brief.' }, jobs, stalls, 'owner');
  assert.equal(selected.job?.id, 'job-a');
  assert.equal(selected.stall?.id, 'stall-a');
  assert.throws(() => validateMissionChoice({ jobId: 'job-b', stallId: 'stall-a', reason: 'Own job' }, jobs, stalls, 'owner'));
  assert.throws(() => validateMissionChoice({ jobId: 'job-a', stallId: 'not-owned', reason: 'Invented service' }, jobs, stalls, 'owner'));
  assert.throws(() => validateMissionChoice({ jobId: 'not-open', stallId: 'stall-a', reason: 'Invented job' }, jobs, stalls, 'owner'));
});

void test('no-match must be explicit for both IDs', () => {
  assert.equal(validateMissionChoice({ jobId: 'NONE', stallId: 'NONE', reason: 'No fit.' }, jobs, stalls, 'owner').job, null);
  assert.throws(() => validateMissionChoice({ jobId: 'job-a', stallId: 'NONE', reason: 'Partial' }, jobs, stalls, 'owner'));
  assert.throws(() => validateMissionChoice({ jobId: 'NONE', stallId: 'stall-a', reason: 'Partial' }, jobs, stalls, 'owner'));
});
