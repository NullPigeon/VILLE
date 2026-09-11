import assert from 'node:assert/strict';
import test from 'node:test';
import { runWorker, artifactFor, builderFailureCode, extractOutput, materializeGeneratedAsset, reviewedArtifactFor } from '../scripts/build-worker.mjs';
import { MODULE_CSP, artifactPathFor, validateModule, validateSpec, validProposalId } from '../lib/build-contract.ts';

const html = '<!doctype html><html><head><title>Town counter</title></head><body><button id="count">Count</button><script>let count = 0; document.querySelector("button").onclick = () => { document.querySelector("button").textContent = String(++count); };</script></body></html>';
const spec = { version: 1, runtime: 'sandbox-html', goal: 'A counter for the citizens of town.', acceptance: ['Clicking Count increases the displayed count.'], constraints: 'No persistent state.' };
const work = { title: 'Town counter', job: { proposal_id: 'LV-1', lease_id: '11111111-1111-4111-8111-111111111111', attempt: 1, revision: 1, branch: 'codex/build-lv-1-1', spec } };
const sha = 'a'.repeat(40);
const baseSha = 'b'.repeat(40);
const env = { LANDVILLE_SITE_URL: 'https://town.example', LANDVILLE_WORKER_SECRET: 'w'.repeat(40), LANDVILLE_BUILDER_ENABLED: 'true', LANDVILLE_BUILDER_MODEL: 'configured-test-model', LANDVILLE_GITHUB_WRITE_TOKEN: 'github-test-only', OPENAI_API_KEY: 'openai-test-only' };
const acceptanceReport = ['The Count control increments the visible total in the inline script.'];
const designReport = ['The idea reads immediately.', 'The visual language matches LANDVILLE.', 'The interaction is responsive and accessible.', 'The module makes no unsupported claims.'];
const intentReport = ['The requested subject is present.', 'The requested story and tone are present.', 'The requested interaction is implemented.'];
const reviewResult = { html, storage: [], acceptanceReport, designGate: 'PASS', designReport, intentGate: 'PASS', intentReport, scrapyGate: 'PASS', scrapyReport: 'A proposal-specific mechanical surprise carries Scrapy\'s dry civic wit.' };
const architectureResult = { feasibility: 'SUPPORTED', implementationPlan: ['Map the approved scope.', 'Build the complete interaction.', 'Polish the responsive presentation.'], visualDirection: 'Use the trusted LANDVILLE visual language.', interactionPlan: ['Make the primary control functional.'], accuracyPlan: ['Use only verified supplied facts.'], limitations: [], scrapySignature: 'A small mechanical counter protests after repeated clicks.', storagePlan: [] };
const builderContext = { sources: [{ path: 'scripts/LANDVILLE_BUILDER.md', text: 'LANDVILLE test context' }], referenceImage: 'data:image/png;base64,dGVzdA==', subjectReferences: [], creativeDirection: null };
const worker = (environment, http) => runWorker(environment, http, async () => builderContext);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
function harness(override = () => undefined) {
  const calls = [];
  const http = async (url, init) => {
    const call = { url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, init };
    calls.push(call);
    const other = override(call, calls);
    if (other) return other;
    if (url.endsWith('/api/internal/treasury-rewards')) return json({ refresh: { state: 'REFRESHED' }, payout: { state: 'IDLE' } });
    if (url.endsWith('/api/internal/builds')) return json(call.body.action === 'CLAIM' ? { work } : { work: null });
    if (url.includes('api.openai.com')) {
      const name = call.body?.text?.format?.name;
      const result = name === 'city_architecture' ? architectureResult : name === 'city_module' ? { html } : reviewResult;
      return json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
    }
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
  assert.equal(artifactPathFor('LV-1', 1), 'city-modules/LV-1.json');
  assert.equal(artifactPathFor('LV-1', 2), 'city-modules/LV-1-r2.json');
  assert.throws(() => artifactPathFor('LV-1', 100));
});
void test('artifact is deterministic and contains only the scoped module contract', () => {
  const first = artifactFor(work, { html, path: '../../app/api/auth/route.ts', command: 'exfiltrate' });
  assert.deepEqual(first, artifactFor(work, { html }));
  const record = JSON.parse(first.content);
  assert.deepEqual(Object.keys(record), ['version', 'proposalId', 'title', 'html', 'acceptance', 'capabilities']);
  assert.deepEqual(record.acceptance, spec.acceptance);
  assert.deepEqual(record.capabilities.storage, []);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
});
void test('reviewed artifacts require one evidence statement per acceptance check', () => {
  assert.equal(reviewedArtifactFor(work, reviewResult).report[0], acceptanceReport[0]);
  assert.throws(() => reviewedArtifactFor(work, { ...reviewResult, acceptanceReport: [] }));
  assert.throws(() => reviewedArtifactFor(work, { ...reviewResult, designGate: 'FAIL' }));
  assert.throws(() => reviewedArtifactFor(work, { ...reviewResult, intentGate: 'FAIL' }));
  assert.throws(() => reviewedArtifactFor(work, { ...reviewResult, scrapyGate: 'FAIL' }));
});
void test('reviewed artifacts retain and enforce every storage declaration used by their code', () => {
  const storageHtml = html.replace('</body>', `<script>window.parent.postMessage({type:'landville:capability-request',requestId:'ideas',capability:'module.storage',input:{operation:'shared.list',collection:'panic_ideas',limit:5}},'*')</script></body>`);
  const storage = [{ name: 'panic_ideas', mode: 'shared', description: 'Public citizen idea records.' }];
  const reviewed = reviewedArtifactFor(work, { ...reviewResult, html: storageHtml, storage });
  assert.deepEqual(JSON.parse(reviewed.artifact.content).capabilities.storage, storage);
  assert.throws(() => artifactFor(work, { html: storageHtml, storage: [] }), /not declared/);
  assert.throws(() => artifactFor(work, { html: storageHtml, storage: [{ ...storage[0], mode: 'private' }] }), /mode shared/);
});
void test('one generated image is materialized only at the fixed marker', () => {
  const marked = html.replace('<button', '<img data-landville-generated-asset alt="Town"/><button');
  assert.match(materializeGeneratedAsset(marked, 'dGVzdA=='), /src="data:image\/png;base64,dGVzdA=="/);
  assert.throws(() => materializeGeneratedAsset(html, 'dGVzdA=='));
  assert.throws(() => materializeGeneratedAsset(marked, null));
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
  assert.deepEqual(await worker(env, f.http), { state: 'REVIEW', id: 'LV-1', pr: 42 });
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
  assert.equal(f.calls.filter((call) => call.url.includes('api.openai.com')).length, 3);
  assert.equal(ai.body.store, true); assert.equal(ai.body.background, true); assert.equal(ai.body.reasoning.effort, 'high'); assert.equal(ai.body.text.format.strict, true);
  assert.deepEqual(ai.body.tools, [{ type: 'web_search_preview', search_context_size: 'high' }]);
  assert.equal(ai.body.input[0].content.find((item) => item.type === 'input_image').type, 'input_image');
  assert.ok(ai.body.input[0].content[0].text.includes('LANDVILLE test context'));
  const buildAi = f.calls.filter((call) => call.url.includes('api.openai.com'))[1];
  assert.deepEqual(buildAi.body.tools, [{ type: 'web_search_preview', search_context_size: 'medium' }, { type: 'image_generation' }]);
  assert.match(buildAi.body.input[0].content[0].text, /approvedArchitecture/);
  assert.match(buildAi.body.input[0].content[0].text, /market\.dexscreener/);
  assert.match(buildAi.body.input[0].content[0].text, /chain\.robinhood/);
  const reviewAi = f.calls.filter((call) => call.url.includes('api.openai.com'))[2];
  assert.deepEqual(reviewAi.body.tools, [{ type: 'image_generation' }]);
  assert.match(f.calls.find((call) => call.url.endsWith('pulls')).body.body, /Scrapy character gate/);
  assert.ok(!JSON.stringify(ai.body).includes(env.LANDVILLE_GITHUB_WRITE_TOKEN));
});
void test('generated artwork is shown to the reviewer and embedded only after review', async () => {
  const markedHtml = html.replace('<body>', '<body><img data-landville-generated-asset alt="Town artwork">');
  const image = Buffer.alloc(100, 1).toString('base64');
  let aiCalls = 0;
  const f = harness((call) => {
    if (!call.url.includes('api.openai.com')) return undefined;
    if (call.body.text.format.name === 'city_architecture') return json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(architectureResult) }] }] });
    aiCalls += 1;
    return call.body.text.format.name === 'city_module'
      ? json({ status: 'completed', output: [{ type: 'image_generation_call', result: image }, { content: [{ type: 'output_text', text: JSON.stringify({ html: markedHtml }) }] }] })
      : json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ ...reviewResult, html: markedHtml }) }] }] });
  });
  assert.equal((await worker(env, f.http)).state, 'REVIEW');
  const reviewCall = f.calls.filter((call) => call.url.includes('api.openai.com'))[2];
  assert.equal(reviewCall.body.input[0].content.filter((item) => item.type === 'input_image').length, 2);
  const artifact = JSON.parse(f.calls.find((call) => call.url.endsWith('git/trees')).body.tree[0].content);
  assert.match(artifact.html, new RegExp(`src="data:image/png;base64,${image}"`));
  assert.doesNotMatch(artifact.html, /data-landville-generated-asset/);
});
void test('trusted subject references and creative direction reach every model pass', async () => {
  const groundedContext = { ...builderContext, creativeDirection: 'Keep the voted visual joke.', subjectReferences: [{ label: 'Known subject', imageUrl: 'https://upload.wikimedia.org/reference.jpg', sourceUrl: 'https://commons.wikimedia.org/reference', credit: 'Photographer, CC BY-SA 4.0' }] };
  const f = harness();
  assert.equal((await runWorker(env, f.http, async (proposalId) => { assert.equal(proposalId, 'LV-1'); return groundedContext; })).state, 'REVIEW');
  for (const call of f.calls.filter((entry) => entry.url.includes('api.openai.com'))) {
    const input = call.body.input[0].content;
    assert.ok(input.some((item) => item.type === 'input_image' && item.image_url === groundedContext.subjectReferences[0].imageUrl));
    assert.match(input[0].text, /Keep the voted visual joke/);
  }
});
void test('reviewer-generated correction replaces the first-pass artwork', async () => {
  const markedHtml = html.replace('<body>', '<body><img data-landville-generated-asset alt="Town artwork">');
  const draftImage = Buffer.alloc(100, 1).toString('base64');
  const correctedImage = Buffer.alloc(100, 2).toString('base64');
  let aiCalls = 0;
  const f = harness((call) => {
    if (!call.url.includes('api.openai.com')) return undefined;
    if (call.body.text.format.name === 'city_architecture') return json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(architectureResult) }] }] });
    aiCalls += 1;
    const outputText = { content: [{ type: 'output_text', text: JSON.stringify(call.body.text.format.name === 'city_module' ? { html: markedHtml } : { ...reviewResult, html: markedHtml }) }] };
    return json({ status: 'completed', output: [{ type: 'image_generation_call', result: call.body.text.format.name === 'city_module' ? draftImage : correctedImage }, outputText] });
  });
  assert.equal((await worker(env, f.http)).state, 'REVIEW');
  const artifact = JSON.parse(f.calls.find((call) => call.url.endsWith('git/trees')).body.tree[0].content);
  assert.match(artifact.html, new RegExp(correctedImage));
  assert.doesNotMatch(artifact.html, new RegExp(draftImage));
});
void test('background responses are polled until complete', async () => {
  let queued = false;
  const f = harness((call) => {
    if (call.url.endsWith('/v1/responses') && call.body?.text?.format?.name === 'city_architecture' && !queued) {
      queued = true;
      return json({ id: 'resp_test', status: 'queued' });
    }
    if (call.url.endsWith('/v1/responses/resp_test')) return json({ id: 'resp_test', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(architectureResult) }] }] });
    return undefined;
  });
  assert.equal((await worker({ ...env, LANDVILLE_BUILDER_POLL_MS: '1' }, f.http)).state, 'REVIEW');
  assert.equal(f.calls.find((call) => call.url.endsWith('/v1/responses/resp_test')).method, 'GET');
});
void test('an invalid architecture receives one focused repair pass', async () => {
  let architectureCalls = 0;
  const f = harness((call) => {
    if (call.body?.text?.format?.name !== 'city_architecture') return undefined;
    architectureCalls += 1;
    const result = architectureCalls === 1 ? { ...architectureResult, feasibility: 'UNSUPPORTED' } : architectureResult;
    return json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  });
  assert.equal((await worker(env, f.http)).state, 'REVIEW');
  assert.equal(architectureCalls, 2);
  const repaired = f.calls.filter((call) => call.body?.text?.format?.name === 'city_architecture')[1];
  assert.match(repaired.body.input[0].content[0].text, /rejectedArchitecture/);
});
void test('a failed creative review receives one automatic repair pass', async () => {
  let reviews = 0;
  const failed = { ...reviewResult, designGate: 'FAIL', designReport: ['Hierarchy needs repair.', ...designReport.slice(1)] };
  const f = harness((call) => {
    if (call.body?.text?.format?.name === 'reviewed_city_module') {
      reviews += 1;
      return json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(failed) }] }] });
    }
    if (call.body?.text?.format?.name === 'repaired_city_module') return json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(reviewResult) }] }] });
    return undefined;
  });
  assert.equal((await worker(env, f.http)).state, 'REVIEW');
  assert.equal(reviews, 1);
  assert.equal(f.calls.filter((call) => call.url.includes('api.openai.com')).length, 4);
});
void test('a corrective revision writes a new immutable artifact path', async () => {
  const revised = { ...work, job: { ...work.job, attempt: 2, revision: 2, branch: 'codex/build-lv-1-2' } };
  const f = harness((call) => call.body?.action === 'CLAIM' ? json({ work: revised }) : undefined);
  assert.equal((await worker(env, f.http)).state, 'REVIEW');
  assert.equal(f.calls.find((call) => call.url.endsWith('git/trees')).body.tree[0].path, 'city-modules/LV-1-r2.json');
});
void test('disabled builder only finalizes votes and makes no AI/GitHub requests', async () => {
  const f = harness();
  assert.deepEqual(await worker({ ...env, LANDVILLE_BUILDER_ENABLED: 'false', OPENAI_API_KEY: '' }, f.http), { state: 'IDLE', treasuryState: 'IDLE' });
  assert.equal(f.calls.length, 2); assert.equal(f.calls.find((call) => call.url.endsWith('/api/internal/builds')).body.action, 'TICK');
});
void test('idle queue makes no paid model request', async () => {
  const f = harness((call) => call.body?.action === 'CLAIM' ? json({ work: null }) : undefined);
  assert.equal((await worker(env, f.http)).state, 'IDLE'); assert.equal(f.calls.length, 2);
});
void test('missing credentials fail before claiming work', async () => {
  const f = harness();
  await assert.rejects(worker({ ...env, OPENAI_API_KEY: '' }, f.http)); assert.equal(f.calls.length, 0);
});
void test('model failure records a failed attempt, never a fake successful build', async () => {
  const f = harness((call) => call.url.includes('api.openai.com') ? json({ secret: 'must not leak' }, 429) : undefined);
  await assert.rejects(worker(env, f.http), /architecture \(rate_limit\)/);
  assert.equal(f.calls.at(-1).body.action, 'FAIL');
  assert.equal(f.calls.at(-1).body.phase, 'ARCHITECTURE');
  assert.equal(f.calls.at(-1).body.failure, 'RATE_LIMIT');
  assert.ok(!f.calls.some((call) => call.url.endsWith('git/trees')));
  assert.ok(!JSON.stringify(f.calls.at(-1).body).includes('must not leak'));
});
void test('builder failure diagnostics expose only a safe category', () => {
  assert.equal(builderFailureCode(new Error('AI background response timed out.')), 'TIMEOUT');
  assert.equal(builderFailureCode(new Error('Module storage is used but not declared.')), 'CONTRACT');
  assert.equal(builderFailureCode(new Error('private provider detail')), 'UNKNOWN');
});
void test('receipt retries do not create duplicate commits or PRs', async () => {
  let attempts = 0;
  const f = harness((call) => call.body?.action === 'COMPLETE' && attempts++ < 2 ? json({}, 503) : undefined);
  assert.equal((await worker(env, f.http)).state, 'REVIEW');
  assert.equal(f.calls.filter((call) => call.url.endsWith('pulls')).length, 1);
  assert.equal(f.calls.filter((call) => call.body?.action === 'COMPLETE').length, 3);
});
void test('invalid module output never reaches GitHub writes', async () => {
  const f = harness((call) => call.body?.text?.format?.name === 'city_module' ? json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '{"html":"fake"}' }] }] }) : undefined);
  await assert.rejects(worker(env, f.http));
  assert.ok(!f.calls.some((call) => call.url.includes('api.github.com') && call.method === 'POST'));
});
void test('untrusted job cannot choose a repository branch', async () => {
  const f = harness((call) => call.body?.action === 'CLAIM' ? json({ work: { ...work, job: { ...work.job, branch: 'main' } } }) : undefined);
  await assert.rejects(worker(env, f.http), /Invalid server job/);
  assert.equal(f.calls.length, 2);
});
