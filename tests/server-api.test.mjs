import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const wallet = `0x${'a'.repeat(40)}`;
const other = `0x${'b'.repeat(40)}`;
const snapshot = { wallet, chainId: 4663, tokenAddress: `0x${'c'.repeat(40)}`, tokenDecimals: 18, tokenBalance: '250000000000000000000000', tokenBalanceFormatted: '250,000', weight: 2, blockNumber: '1234', capturedAt: new Date().toISOString(), source: 'chain' };
const proposal = { id: 'LV-1', request_id: randomUUID(), creator_wallet: wallet, title: 'Town radio', summary: 'A public radio for the town.', category: 'UTILITY', district: 'THE DUMP', status: 'LIVE', build_tier: 'PENDING_REVIEW', eligibility_snapshot: snapshot, yes: 0, no: 0, created_at: new Date().toISOString(), closes_at: new Date(Date.now() + 43_200_000).toISOString() };
const tokenStatus = { address: '0xf7CdBd39720Ea583ec56e3a9ff57E805e93e7BBe', symbol: 'SCRAPY', name: 'LANDVILLE', decimals: 18, chainId: 4663, totalSupply: '1000000000000000000000000000', totalSupplyFormatted: '1,000,000,000', blockNumber: '1234', verifiedAt: new Date().toISOString() };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

// Execute the real route/helper source in isolation. Only HTTP and the chain read
// are replaced; no test request reaches Supabase, OpenAI or a funded wallet.
function fixture(handler, extraEnv = {}, overrides = {}) {
  const calls = [];
  const cache = new Map();
  let balanceReads = 0;
  const env = { NODE_ENV: 'test', WALLET_SESSION_SECRET: 'server-api-tests-only-not-a-real-secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test_only', ...extraEnv };
  const fetch = async (url, init = {}) => {
    const call = { url: String(url), method: init.method || 'GET', headers: new Headers(init.headers), body: init.body ? JSON.parse(init.body) : null };
    calls.push(call);
    const result = await handler(call, calls);
    if (result) return result;
    if (call.url.includes('landville_citizens?')) return json([{ wallet }]);
    if (call.url.endsWith('/rpc/landville_rate_limit')) return json(true);
    return json([]);
  };
  function load(name) {
    if (overrides[name]) return overrides[name];
    if (name === 'server-only') return {};
    if (name === '@/lib/server/voting') return { readVotingSnapshot: async (address) => { balanceReads++; return { ...snapshot, wallet: address }; } };
    if (name === '@/lib/server/token-status') return { readScrapyTokenStatus: async () => tokenStatus };
    if (!name.startsWith('@/') && !name.endsWith('.ts')) return require(name);
    const file = name.startsWith('@/') ? path.join(root, `${name.slice(2)}.ts`) : path.join(root, name);
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const run = vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, { process: { env }, console: { error() {} }, Buffer, fetch, Headers, Response, URL, AbortSignal, Date, setTimeout, clearTimeout });
    run(load, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const session = load('@/lib/wallet-session');
  function request(url, body = {}, options = {}) {
    const headers = { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', ...options.headers };
    if (options.signed) headers.Cookie = `${session.SESSION_COOKIE}=${session.sealCookie({ address: options.wallet || wallet, expiresAt: Date.now() + 60000 })}`;
    const method = options.method || 'POST';
    return new NextRequest(`http://localhost:3000${url}`, { method, headers, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
  }
  return { load, calls, request, session, get balanceReads() { return balanceReads; } };
}

for (const [route, url, method] of [
  ['app/api/chat/route.ts', '/api/chat', 'POST'],
  ['app/api/mayor/route.ts', '/api/mayor', 'POST'],
  ['app/api/proposals/route.ts', '/api/proposals', 'POST'],
  ['app/api/proposals/[id]/vote/route.ts', '/api/proposals/LV-1/vote', 'POST'],
  ['app/api/admin/builds/[id]/route.ts', '/api/admin/builds/LV-1', 'PATCH'],
  ['app/api/admin/build-jobs/[id]/route.ts', '/api/admin/build-jobs/LV-1', 'POST'],
  ['app/api/admin/build-jobs/[id]/release/route.ts', '/api/admin/build-jobs/LV-1/release', 'POST'],
]) void test(`${url} rejects anonymous writes before any database/chain request`, async () => {
  const f = fixture(() => undefined);
  const response = await f.load(route)[method](f.request(url, {}, { method }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 401);
  assert.equal(f.calls.length, 0);
  assert.equal(f.balanceReads, 0);
});

void test('anonymous visitors cannot execute modules', async () => {
  const f = fixture(() => undefined);
  const response = await f.load('app/api/modules/[id]/route.ts').GET(f.request('/api/modules/LV-1', {}, { method: 'GET' }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 401); assert.equal(f.calls.length, 0);
});
void test('worker authorization is independent of wallet sessions and fails closed', async () => {
  for (const secret of ['', 'short', 'w'.repeat(40)]) {
    const f = fixture(() => undefined, { LANDVILLE_WORKER_SECRET: secret });
    const response = await f.load('app/api/internal/builds/route.ts').POST(f.request('/api/internal/builds', { action: 'CLAIM' }, { signed: true }));
    assert.equal(response.status, secret.length >= 32 ? 401 : 503); assert.equal(f.calls.length, 0);
  }
});
void test('disabled builder refuses claims but authorized scheduler can finalize votes', async () => {
  const f = fixture((call) => call.url.endsWith('/rpc/landville_claim_build') ? json(null) : undefined, { LANDVILLE_WORKER_SECRET: 'w'.repeat(40), LANDVILLE_BUILD_ACTOR: wallet, LANDVILLE_ADMIN_WALLETS: wallet });
  const route = f.load('app/api/internal/builds/route.ts');
  const options = { headers: { Authorization: `Bearer ${'w'.repeat(40)}` } };
  assert.equal((await route.POST(f.request('/api/internal/builds', { action: 'CLAIM' }, options))).status, 503);
  assert.equal(f.calls.length, 0);
  assert.equal((await route.POST(f.request('/api/internal/builds', { action: 'TICK' }, options))).status, 200);
  assert.equal(f.calls.at(-1).body.p_claim, false);
});
void test('manual status changes cannot bypass verified publication', async () => {
  for (const action of ['START_BUILD', 'PUBLISH']) {
    const f = fixture(() => undefined, { LANDVILLE_ADMIN_WALLETS: wallet });
    const response = await f.load('app/api/admin/builds/[id]/route.ts').PATCH(f.request('/api/admin/builds/LV-1', { action, expectedStatus: 'BUILDING', note: 'Reviewed release', modulePath: '/modules/LV-1', releaseRef: '12345678' }, { signed: true, method: 'PATCH' }), { params: Promise.resolve({ id: 'LV-1' }) });
    assert.equal(response.status, 409);
    assert.ok(!f.calls.some((call) => call.url.endsWith('/rpc/landville_transition')));
  }
});
void test('specification goal is copied from the voted proposal, not admin request fields', async () => {
  const f = fixture((call) => call.url.includes('landville_proposals?') ? json([proposal]) : call.url.endsWith('/rpc/landville_prepare_build') ? json({ state: 'READY' }) : undefined, { LANDVILLE_ADMIN_WALLETS: wallet });
  const response = await f.load('app/api/admin/build-jobs/[id]/route.ts').POST(f.request('/api/admin/build-jobs/LV-1', { action: 'PREPARE', goal: 'Replace the wallet authentication', acceptance: ['The radio has a visible play button.'] }, { signed: true }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 200);
  assert.equal(f.calls.at(-1).body.p_spec.goal, proposal.summary);
});

const releaseEnv = { LANDVILLE_ADMIN_WALLETS: wallet, VERCEL_ENV: 'production', VERCEL_DEPLOYMENT_ID: 'dpl_test', VERCEL_GIT_COMMIT_SHA: 'c'.repeat(40), LANDVILLE_VERCEL_PROJECT_ID: 'prj_test', NEXT_PUBLIC_SITE_URL: 'https://town.example', LANDVILLE_GITHUB_READ_TOKEN: 'read-only-test', LANDVILLE_VERCEL_READ_TOKEN: 'read-only-vercel-test' };
function releaseFixture(change = {}) {
  const sha = 'a'.repeat(40), hash = 'b'.repeat(64), mergedSha = 'c'.repeat(40);
  const job = { proposal_id: 'LV-1', state: 'REVIEW', branch: 'codex/build-lv-1-1', commit_sha: sha, content_hash: hash, pr_number: 42, ...change.job };
  const pr = { merged: true, merge_commit_sha: mergedSha, head: { sha, ref: job.branch, repo: { full_name: 'NullPigeon/VILLE' } }, base: { ref: 'main', repo: { full_name: 'NullPigeon/VILLE' } }, ...change.pr };
  return fixture((call) => {
    if (call.url.includes('landville_build_jobs?')) return json([job]);
    if (call.url.includes('/pulls/42/files')) return json(change.files || [{ filename: 'city-modules/LV-1.json', status: 'added' }]);
    if (call.url.endsWith('/pulls/42')) return json(pr);
    if (call.url.includes('/check-runs?')) return json({ check_runs: change.checks || [{ name: 'City checks', status: 'completed', conclusion: 'success', app: { slug: 'github-actions' } }] });
    if (call.url.includes('api.vercel.com/v13/deployments/')) return json({ id: 'dpl_test', projectId: 'prj_test', target: 'production', readyState: 'READY', gitSource: { sha: mergedSha }, ...change.deployment });
    if (call.url.includes('api.vercel.com/v4/aliases/')) return json({ deploymentId: 'dpl_test', projectId: 'prj_test', ...change.alias });
    if (call.url.endsWith('/rpc/landville_publish_build')) return json({ ...proposal, status: 'BUILT' });
  }, { ...releaseEnv, ...change.env }, { '@/lib/server/city-module': { readCityModule: async () => ({ module: {}, hash: change.hash || hash }) } });
}
void test('matching PR, CI, production alias and artifact permit one verified publication', async () => {
  const f = releaseFixture();
  const response = await f.load('app/api/admin/build-jobs/[id]/release/route.ts').POST(f.request('/api/admin/build-jobs/LV-1/release', { releaseUrl: 'https://attacker.example' }, { signed: true }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 200);
  const publish = f.calls.find((call) => call.url.endsWith('/rpc/landville_publish_build'));
  assert.equal(publish.body.p_release, `dpl_test:${'c'.repeat(40)}`);
  assert.ok(!f.calls.some((call) => call.url.includes('attacker.example')));
});
for (const [label, change, expected] of [
  ['unmerged PR', { pr: { merged: false } }, 409],
  ['modified PR head', { pr: { head: { sha: 'd'.repeat(40), ref: 'codex/build-lv-1-1', repo: { full_name: 'NullPigeon/VILLE' } } } }, 409],
  ['extra repository changes', { files: [{ filename: '.github/workflows/evil.yml', status: 'added' }] }, 409],
  ['missing checks', { checks: [] }, 409],
  ['failed CI', { checks: [{ name: 'City checks', status: 'completed', conclusion: 'failure', app: { slug: 'github-actions' } }] }, 409],
  ['preview deployment', { deployment: { target: 'preview' } }, 409],
  ['wrong project', { deployment: { projectId: 'prj_other' } }, 409],
  ['failed deployment', { deployment: { readyState: 'ERROR' } }, 409],
  ['old alias', { alias: { deploymentId: 'dpl_other' } }, 409],
  ['redirecting alias', { alias: { redirect: 'https://other.example' } }, 409],
  ['different deployed artifact', { hash: 'd'.repeat(64) }, 409],
  ['different production commit', { deployment: { gitSource: { sha: 'd'.repeat(40) } } }, 409],
  ['non-production environment', { env: { VERCEL_ENV: 'preview' } }, 503],
]) void test(`${typeof label === 'string' ? label : 'Invalid release'} cannot publish a world object`, async () => {
  const f = releaseFixture(change);
  const response = await f.load('app/api/admin/build-jobs/[id]/release/route.ts').POST(f.request('/api/admin/build-jobs/LV-1/release', {}, { signed: true }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, expected);
  assert.ok(!f.calls.some((call) => call.url.endsWith('/rpc/landville_publish_build')));
});

void test('module HTML is served only with an opaque CSP and no caching', async () => {
  const f = fixture(() => undefined, { LANDVILLE_ADMIN_WALLETS: wallet }, { '@/lib/server/city-module': { readCityModule: async () => ({ module: { html: '<html>module</html>' }, hash: 'b'.repeat(64) }) } });
  const response = await f.load('app/api/modules/[id]/route.ts').GET(f.request('/api/modules/LV-1', {}, { signed: true, method: 'GET' }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /^sandbox allow-scripts;/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});
void test('a modified published module cannot silently execute for a citizen', async () => {
  const f = fixture((call) => call.url.includes('landville_objects?') ? json([{ proposal_id: 'LV-1' }]) : call.url.includes('landville_build_jobs?') ? json([{ state: 'RELEASED', content_hash: 'b'.repeat(64) }]) : undefined, {}, { '@/lib/server/city-module': { readCityModule: async () => ({ module: { html: '<html>module</html>' }, hash: 'c'.repeat(64) }) } });
  const response = await f.load('app/api/modules/[id]/route.ts').GET(f.request('/api/modules/LV-1', {}, { signed: true, method: 'GET' }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 409);
});

void test('cross-site mutation is denied before database access', async () => {
  const f = fixture(() => undefined);
  const response = await f.load('app/api/proposals/route.ts').POST(f.request('/api/proposals', {}, { signed: true, headers: { Origin: 'https://untrusted.example' } }));
  assert.equal(response.status, 403); assert.equal(f.calls.length, 0);
});

void test('proposal snapshot, author and governance rules come from the server, not browser fields', async () => {
  const f = fixture((call) => call.url.endsWith('/rpc/landville_create_proposal') ? json(proposal) : undefined);
  const response = await f.load('app/api/proposals/route.ts').POST(f.request('/api/proposals', { title: proposal.title, summary: proposal.summary, category: 'UTILITY', district: 'THE DUMP', requestId: randomUUID(), wallet: other, snapshot: { weight: 999999 }, quorum: 0 }, { signed: true }));
  assert.equal(response.status, 200);
  const call = f.calls.find((entry) => entry.url.endsWith('/rpc/landville_create_proposal'));
  assert.equal(call.body.p_wallet, wallet); assert.equal(call.body.p_snapshot.weight, 2);
  assert.equal(call.body.p_quorum_votes, undefined); assert.equal(call.body.p_approval_percent, undefined);
  assert.equal(call.body.p_voting_hours, undefined, 'The database owns the fixed 12-hour deadline');
  assert.equal(call.body.p_snapshot.wallet, wallet); assert.equal(f.balanceReads, 1);
  assert.equal(call.headers.get('authorization'), null, 'Modern secret key must not be used as a JWT');
});

void test('vote API never trusts a submitted weight or wallet', async () => {
  const f = fixture((call) => call.url.endsWith('/rpc/landville_cast_vote') ? json({ proposal_id: 'LV-1', wallet, choice: 'YES', snapshot }) : undefined);
  const response = await f.load('app/api/proposals/[id]/vote/route.ts').POST(f.request('/api/proposals/LV-1/vote', { choice: 'YES', wallet: other, weight: 999 }, { signed: true }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 200);
  const call = f.calls.find((entry) => entry.url.endsWith('/rpc/landville_cast_vote'));
  assert.equal(call.body.p_wallet, wallet); assert.equal(call.body.p_snapshot.weight, 2); assert.equal(f.balanceReads, 1);
});

void test('signed non-admin cannot advance builds', async () => {
  const f = fixture(() => undefined, { LANDVILLE_ADMIN_WALLETS: other });
  const response = await f.load('app/api/admin/builds/[id]/route.ts').PATCH(f.request('/api/admin/builds/LV-1', { action: 'PUBLISH' }, { signed: true, method: 'PATCH' }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 403); assert.equal(f.calls.length, 0);
});

void test('admin publication rejects external URLs and privileged routes', async () => {
  for (const modulePath of ['https://example.com', '//example.com', '/api/private', '/admin', '/%2fexample']) {
    const f = fixture(() => undefined, { LANDVILLE_ADMIN_WALLETS: wallet });
    const response = await f.load('app/api/admin/builds/[id]/route.ts').PATCH(f.request('/api/admin/builds/LV-1', { action: 'PUBLISH', expectedStatus: 'BUILDING', note: 'Reviewed release', modulePath, releaseRef: '12345678' }, { signed: true, method: 'PATCH' }), { params: Promise.resolve({ id: 'LV-1' }) });
    assert.equal(response.status, 400, modulePath);
    assert.ok(!f.calls.some((entry) => entry.url.endsWith('/rpc/landville_transition')));
  }
});

void test('private history uses only the signed wallet, ignoring a supplied owner', async () => {
  const f = fixture(() => undefined);
  const response = await f.load('app/api/mayor/route.ts').GET(f.request(`/api/mayor?wallet=${other}`, {}, { signed: true, method: 'GET' }));
  assert.equal(response.status, 200);
  const call = f.calls.find((entry) => entry.url.includes('landville_messages?'));
  assert.ok(call.url.includes(`owner_wallet=eq.${wallet}`)); assert.ok(!call.url.includes(other));
});

void test('Town history is public but always excludes private messages', async () => {
  const f = fixture(() => undefined);
  const response = await f.load('app/api/chat/route.ts').GET(f.request('/api/chat', {}, { method: 'GET' }));
  assert.equal(response.status, 200);
  assert.ok(f.calls[0].url.includes('channel=eq.TOWN&owner_wallet=is.null'));
});

void test('official SCRAPY metadata is public and needs no database or wallet session', async () => {
  const f = fixture(() => undefined);
  const response = await f.load('app/api/token/route.ts').GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), tokenStatus);
  assert.equal(f.calls.length, 0);
  assert.match(response.headers.get('cache-control'), /s-maxage=30/);
});

void test('first ten messages need no token read; bonus messages require a server snapshot', async () => {
  for (const bonus of [false, true]) {
    let submits = 0;
    const requestId = randomUUID();
    const message = { id: `citizen-${requestId}`, author: '@citizen_aaaaaa', wallet, body: 'Town radio please', kind: 'CITIZEN', created_at: new Date().toISOString() };
    const f = fixture((call) => {
      if (call.url.endsWith('/rpc/landville_submit_message')) {
        submits++;
        if (bonus && submits === 1) return json({ message: 'HOLD_CHECK_REQUIRED' }, 400);
        return json(message);
      }
      return undefined;
    });
    const response = await f.load('app/api/chat/route.ts').POST(f.request('/api/chat', { body: message.body, requestId }, { signed: true }));
    assert.equal(response.status, 200); assert.equal(f.balanceReads, bonus ? 1 : 0);
    assert.equal(submits, bonus ? 2 : 1);
  }
});

void test('daily limit is a real error, not a fake successful reply', async () => {
  const f = fixture((call) => call.url.endsWith('/rpc/landville_submit_message') ? json({ message: 'DAILY_MESSAGE_LIMIT' }, 400) : undefined);
  const response = await f.load('app/api/chat/route.ts').POST(f.request('/api/chat', { body: 'Hello town', requestId: randomUUID() }, { signed: true }));
  assert.equal(response.status, 429); assert.equal(f.balanceReads, 0);
  assert.ok(!f.calls.some((call) => call.url.includes('api.openai.com')));
});

void test('signature verification creates a citizen before issuing a session', async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const f = fixture((call) => call.method === 'POST' && call.url.includes('landville_citizens?') ? new Response(null, { status: 204 }) : undefined);
  const message = 'LANDVILLE isolated test sign-in. No transaction.';
  const challenge = f.session.sealCookie({ address: account.address.toLowerCase(), message, expiresAt: Date.now() + 60000 });
  const signature = await account.signMessage({ message });
  const response = await f.load('app/api/auth/verify/route.ts').POST(f.request('/api/auth/verify', { address: account.address, signature }, { headers: { Cookie: `${f.session.CHALLENGE_COOKIE}=${challenge}` } }));
  assert.equal(response.status, 200);
  assert.equal(f.calls[0].body.wallet, account.address.toLowerCase());
  assert.ok(response.headers.get('set-cookie').includes('HttpOnly'));
});

void test('absent Supabase configuration never falls back to local records', async () => {
  const f = fixture(() => undefined, { SUPABASE_SECRET_KEY: '' });
  const response = await f.load('app/api/town/route.ts').GET(f.request('/api/town', {}, { method: 'GET' }));
  assert.equal(response.status, 503); assert.equal(f.calls.length, 0);
  assert.equal((await response.json()).objects, undefined);
});

void test('an active proposal blocks submission before reading the token balance', async () => {
  const f = fixture((call) => call.url.includes('status=in.(LIVE,PASSED,BUILDING)') ? json([{ id: 'LV-1' }]) : undefined);
  const response = await f.load('app/api/proposals/route.ts').POST(f.request('/api/proposals', { title: proposal.title, summary: proposal.summary, category: 'UTILITY', district: 'THE DUMP', requestId: randomUUID() }, { signed: true }));
  assert.equal(response.status, 409); assert.equal(f.balanceReads, 0);
  assert.match((await response.json()).error, /LV-1/);
  assert.ok(!f.calls.some((call) => call.url.endsWith('/rpc/landville_create_proposal')));
});

void test('idempotent retry reuses the original proposal even while its slot is occupied', async () => {
  const f = fixture((call) => {
    if (call.url.includes(`request_id=eq.${proposal.request_id}`)) return json([proposal]);
    if (call.url.endsWith('/rpc/landville_create_proposal')) return json(proposal);
    return undefined;
  });
  const response = await f.load('app/api/proposals/route.ts').POST(f.request('/api/proposals', { title: proposal.title, summary: proposal.summary, category: 'UTILITY', district: 'THE DUMP', requestId: proposal.request_id }, { signed: true }));
  assert.equal(response.status, 200); assert.equal(f.balanceReads, 0);
  assert.ok(!f.calls.some((call) => call.url.includes('status=in.')));
});

void test('a database slot conflict after the preliminary read returns an honest conflict', async () => {
  const f = fixture((call) => call.url.endsWith('/rpc/landville_create_proposal') ? json({ message: 'ACTIVE_PROPOSAL_EXISTS' }, 400) : undefined);
  const response = await f.load('app/api/proposals/route.ts').POST(f.request('/api/proposals', { title: proposal.title, summary: proposal.summary, category: 'UTILITY', district: 'THE DUMP', requestId: randomUUID() }, { signed: true }));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /active proposal/);
});

for (const code of ['BUILD_ALREADY_RUNNING', 'BUILD_QUEUE_ORDER']) void test(`${code} cannot be bypassed by the admin API`, async () => {
  const f = fixture((call) => call.url.endsWith('/rpc/landville_transition') ? json({ message: code }, 400) : undefined, { LANDVILLE_ADMIN_WALLETS: wallet });
  const response = await f.load('app/api/admin/builds/[id]/route.ts').PATCH(f.request('/api/admin/builds/LV-1', { action: 'START_BUILD', expectedStatus: 'PASSED', note: 'Start reviewed build' }, { signed: true, method: 'PATCH' }), { params: Promise.resolve({ id: 'LV-1' }) });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).proposal, undefined);
});
