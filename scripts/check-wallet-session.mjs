// Local HTTP integration check. Uses a fresh, unfunded key in memory only.
// No browser wallet, transactions, chat messages or governance records are created.
import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const origin = process.env.LANDVILLE_TEST_ORIGIN || 'http://localhost:3000';
const url = new URL(origin);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Run this check against a local server only.');
const account = privateKeyToAccount(generatePrivateKey());
const cookies = new Map();

async function request(path, options = {}) {
  const response = await fetch(`${origin}${path}`, {
    ...options,
    headers: { ...options.headers, Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0];
    const split = pair.indexOf('=');
    cookies.set(pair.slice(0, split), pair.slice(split + 1));
  }
  return response;
}

try {
  assert.equal((await request('/api/governance/snapshot')).status, 401);
  const challengeResponse = await request(`/api/auth/challenge?address=${account.address}`);
  assert.equal(challengeResponse.status, 200);
  const { message } = await challengeResponse.json();
  assert.match(message, /Robinhood Chain ID: 4663\n/);
  assert.doesNotMatch(message, /46630/);
  const signature = await account.signMessage({ message });
  const verified = await request('/api/auth/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: account.address, signature }),
  });
  assert.equal(verified.status, 200, 'Identity must work independently of token configuration.');
  assert.equal((await (await request('/api/auth/session')).json()).address, account.address.toLowerCase());
  const snapshot = await request('/api/governance/snapshot');
  assert.ok([200, 502, 503].includes(snapshot.status), `Unexpected snapshot status ${snapshot.status}`);
  const result = await snapshot.json();
  if (snapshot.ok) {
    assert.equal(result.chainId, 4663);
    assert.ok(result.weight >= 1);
  } else {
    assert.equal(result.weight, undefined, 'Failed reads must not fabricate voting power.');
  }
  assert.equal((await (await request('/api/auth/session')).json()).address, account.address.toLowerCase(), 'A failed token read must not revoke a valid wallet identity.');
  console.log(`PASS: signed mainnet identity; snapshot HTTP ${snapshot.status}; no funded wallet or transaction used.`);
} finally {
  await request('/api/auth/session', { method: 'DELETE' });
}
assert.equal((await request('/api/governance/snapshot')).status, 401);
console.log('PASS: sign-out revokes the test session.');
