import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';

const execute = promisify(execFile);
const address = new URL(process.env.LANDVILLE_TEST_DATABASE_URL || 'http://invalid');
if (address.protocol !== 'postgresql:' || !['127.0.0.1', 'localhost'].includes(address.hostname) || address.pathname !== '/landville_test') throw new Error('Use a disposable LOCAL PostgreSQL database named landville_test. Never production.');
const args = ['-X', '--no-password', '-v', 'ON_ERROR_STOP=1', '--dbname', address.href];
async function psql(extra) {
  try { return (await execute('psql', [...args, ...extra], { maxBuffer: 2_000_000 })).stdout; }
  catch (error) { throw new Error(error.stderr || 'PostgreSQL test command failed.'); }
}
await psql(['-f', 'tests/build-database.sql']);
const query = "set role service_role; select public.landville_claim_build('0x' || repeat('a',40));";
const results = await Promise.all(Array.from({ length: 8 }, () => psql(['-tA', '-c', query])));
assert.equal(results.filter((output) => output.includes('"proposal_id": "LV-4"')).length, 1, 'Exactly one concurrent worker acquires the job');
console.log('All five migrations, private archive preservation, provenance, FIFO, leases, failures, publication, permissions and eight concurrent claims passed.');
