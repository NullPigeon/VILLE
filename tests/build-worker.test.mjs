import assert from 'node:assert/strict';
import test from 'node:test';
import { runWorker, artifactFor, extractOutput } from '../scripts/build-worker.mjs';
import { MODULE_CSP, validateModule, validateSpec, validProposalId } from '../lib/build-contract.ts';

const html = '<!doctype html><html><head><title>Town counter</title></head><body><button id="count">Count</button><script>let count = 0; document.querySelector("button").onclick = () => { document.querySelector("button").textContent = String(++count); };</script></body></html>';
const spec = { version: 1, runtime: 'sandbox-html', goal: 'A counter for the citizens of town.', acceptance: ['Clicking Count increases the displayed count.'], constraints: 'No persistent state.' };
const work = { title: 'Town counter', job: { proposal_id: 'LV-1', lease_id: '11111111-1111-4111-8111-111111111111', attempt: 1, branch: 'codex/build-lv-1-1', spec } };
const sha = 'a'.repeat(40);
const baseSha = 'b'.repeat(40);
const env = { LANDVILLE_SITE_URL: 'https://town.example', LANDVILLE_WORKER_SECRET: 'w'.repeat(40), LANDVILLE_BUILDER_ENABLED: 'true', LANDVILLE_BUILDER_MODEL: 'configured-test-model', LANDVILLE_GITHUB_WRITE_TOKEN: 'github-test-only', OPENAI_API_KEY: 'openai-test-only' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
function harness(override = () => undefined) {
  const calls = [];
  const http = async (url, init) => {
    const call = { url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, init };
    calls.push(call);
    const other = override(call, calls);
    if (other) return other;
    if (url.endsWith('/api/internal/builds')) return json(call.body.action === 'CLAIM' ? { work } : { work: null });
    if (url.includes('api.openai.com')) return json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ html }) }] }] });
    if (url.endsWith('git/ref/heads/main')) return json({ object: { sha: baseSha } });
    if (url.endsWith(`git/commits/${baseSha}`)) return json({ tree: { sha: baseSha } });
    if (url.endsWith('git/trees')) return json({ sha: baseSha });
    if (url.endsWith('git/commits')) return json({ sha });
    if (url.endsWith('git/refs')) return json({ ref: work.job.branch });
    if (url.endsWith('pulls')) return json({ number: 42 });
    throw new Error(`Unexpected HTTP request: ${url}`);
  };
  return { calls, http };
}

void test('module contract rejects traversal, alternate runtime and missing acceptance', () => {
  for (const id of ['../.env', 'LV-0', 'LV-1/../../x', 'LV-1.json', 'LV-1?x', 'LV-1\n']) assert.equal(validProposalId(id), false);
  assert.throws(() => validateSpec({ ...spec, runtime: 'node' }));
  assert.throws(() => validateSpec({ ...spec, acceptance: [] }));
  assert.throws(() => validateSpec({ ...spec, acceptance: ['x'] }));
});
void test('artifact is deterministic and contains only the scoped module contract', () => {
  const first = artifactFor(work, { html, path: '../../app/api/auth/route.ts', command: 'exfiltrate' });
  assert.deepEqual(first, artifactFor(work, { html }));
  const record = JSON.parse(first.content);
  assert.deepEqual(Object.keys(record), ['version', 'proposalId', 'title', 'html', 'acceptance']);
  assert.deepEqual(record.acceptance, spec.acceptance);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
});
void test('frames, forms, refresh and cross-proposal artifacts are rejected', () => {
  const record = JSON.parse(artifactFor(work, { html }).content);
  for (const tag of ['<iframe>', '<object>', '<form>', '<base>', '<meta http-equiv="refresh" content="0;url=https://evil.test">']) assert.throws(() => validateModule({ ...record, html: html.replace('</body>', `${tag}</body>`) }, 'LV-1'));
  assert.throws(() => validateModule(record, 'LV-2'));
});
void test('CSP is opaque, denies connections and cannot use same-origin credentials', () => {
  assert.match(MODULE_CSP, /^sandbox allow-scripts;/);
  assert.match(MODULE_CSP, /connect-src 'none'/);
  assert.match(MODULE_CSP, /form-action 'none'/);
  assert.doesNotMatch(MODULE_CSP, /allow-same-origin|unsafe-eval|https:/);
});
void test('incomplete output and refusals do not become modules', () => {
  assert.throws(() => extractOutput({ status: 'incomplete', output: [] }));
  assert.throws(() => extractOutput({ status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No' }] }] }));
});
void test('worker creates one scoped commit and PR, never merges or writes main', async () => {
  const f = harness();
  assert.deepEqual(await runWorker(env, f.http), { state: 'REVIEW', id: 'LV-1', pr: 42 });
  const tree = f.calls.find((call) => call.url.endsWith('git/trees')).body;
  assert.equal(tree.tree.length, 1);
  assert.equal(tree.tree[0].path, 'city-modules/LV-1.json');
  const ref = f.calls.find((call) => call.url.endsWith('git/refs'));
  assert.equal(ref.body.ref, 'refs/heads/codex/build-lv-1-1');
  assert.equal(f.calls.find((call) => call.url.endsWith('git/commits')).body.author.name, 'NullPigeon');
  assert.ok(!f.calls.some((call) => call.url.endsWith('/merge') || call.method === 'PATCH'));
  const receipt = f.calls.at(-1).body;
  assert.equal(receipt.action, 'COMPLETE'); assert.equal(receipt.sha, sha); assert.equal(receipt.pr, 42);
  const ai = f.calls.find((call) => call.url.includes('api.openai.com'));
  assert.equal(ai.body.store, false); assert.equal(ai.body.text.format.strict, true);
  assert.ok(!JSON.stringify(ai.body).includes(env.LANDVILLE_GITHUB_WRITE_TOKEN));
});
void test('disabled builder only finalizes votes and makes no AI/GitHub requests', async () => {
  const f = harness();
  assert.deepEqual(await runWorker({ ...env, LANDVILLE_BUILDER_ENABLED: 'false', OPENAI_API_KEY: '' }, f.http), { state: 'IDLE' });
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].body.action, 'TICK');
});
void test('idle queue makes no paid model request', async () => {
  const f = harness((call) => call.body?.action === 'CLAIM' ? json({ work: null }) : undefined);
  assert.equal((await runWorker(env, f.http)).state, 'IDLE'); assert.equal(f.calls.length, 1);
});
void test('missing credentials fail before claiming work', async () => {
  const f = harness();
  await assert.rejects(runWorker({ ...env, OPENAI_API_KEY: '' }, f.http)); assert.equal(f.calls.length, 0);
});
void test('model failure records a failed attempt, never a fake successful build', async () => {
  const f = harness((call) => call.url.includes('api.openai.com') ? json({ secret: 'must not leak' }, 429) : undefined);
  await assert.rejects(runWorker(env, f.http), /operator review/);
  assert.equal(f.calls.at(-1).body.action, 'FAIL');
  assert.ok(!f.calls.some((call) => call.url.endsWith('git/trees')));
  assert.ok(!JSON.stringify(f.calls.at(-1).body).includes('must not leak'));
});
void test('receipt retries do not create duplicate commits or PRs', async () => {
  let attempts = 0;
  const f = harness((call) => call.body?.action === 'COMPLETE' && attempts++ < 2 ? json({}, 503) : undefined);
  assert.equal((await runWorker(env, f.http)).state, 'REVIEW');
  assert.equal(f.calls.filter((call) => call.url.endsWith('pulls')).length, 1);
  assert.equal(f.calls.filter((call) => call.body?.action === 'COMPLETE').length, 3);
});
void test('invalid module output never reaches GitHub writes', async () => {
  const f = harness((call) => call.url.includes('api.openai.com') ? json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '{"html":"fake"}' }] }] }) : undefined);
  await assert.rejects(runWorker(env, f.http));
  assert.ok(!f.calls.some((call) => call.url.includes('api.github.com') && call.method === 'POST'));
});
void test('untrusted job cannot choose a repository branch', async () => {
  const f = harness((call) => call.body?.action === 'CLAIM' ? json({ work: { ...work, job: { ...work.job, branch: 'main' } } }) : undefined);
  await assert.rejects(runWorker(env, f.http), /Invalid server job/);
  assert.equal(f.calls.length, 1);
});
