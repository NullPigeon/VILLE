import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIVE_ROBINHOOD_NETWORK, activeRobinhoodChain, addRobinhoodNetwork, robinhoodChain } from '../lib/robinhood-chain.ts';

test('product defaults to official Robinhood mainnet, not testnet', () => {
  assert.equal(ACTIVE_ROBINHOOD_NETWORK, 'mainnet');
  assert.equal(activeRobinhoodChain.id, 4663);
  assert.equal(activeRobinhoodChain.hexId, '0x1237');
  assert.equal(activeRobinhoodChain.explorerUrl, 'https://robinhoodchain.blockscout.com');
});

test('decimal and hexadecimal chain IDs agree', () => {
  for (const config of Object.values(robinhoodChain)) assert.equal(Number(config.hexId), config.id);
});

test('wallet switch targets mainnet and verifies selected chain', async (t) => {
  const calls = [];
  t.after(() => { delete globalThis.window; });
  globalThis.window = { ethereum: { request: async (call) => {
    calls.push(call);
    return call.method === 'eth_chainId' ? '0x1237' : null;
  } } };
  await addRobinhoodNetwork();
  assert.deepEqual(calls.map((call) => call.method), ['wallet_switchEthereumChain', 'eth_chainId']);
  assert.equal(calls[0].params[0].chainId, '0x1237');
});

test('unknown mainnet is added, explicitly switched, then checked', async (t) => {
  const calls = [];
  t.after(() => { delete globalThis.window; });
  globalThis.window = { ethereum: { request: async (call) => {
    calls.push(call);
    if (calls.length === 1) throw Object.assign(new Error('Unknown chain'), { code: 4902 });
    return call.method === 'eth_chainId' ? '0x1237' : null;
  } } };
  await addRobinhoodNetwork();
  assert.deepEqual(calls.map((call) => call.method), ['wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_switchEthereumChain', 'eth_chainId']);
  assert.equal(calls[1].params[0].chainId, '0x1237');
  assert.deepEqual(calls[1].params[0].rpcUrls, [activeRobinhoodChain.rpcUrl]);
});

test('wallet left on testnet is rejected', async (t) => {
  t.after(() => { delete globalThis.window; });
  globalThis.window = { ethereum: { request: async ({ method }) => method === 'eth_chainId' ? '0xb626' : null } };
  await assert.rejects(addRobinhoodNetwork(), /Switch your wallet.*4663/);
});

test('a rejected switch never adds another network or falls back', async (t) => {
  const calls = [];
  t.after(() => { delete globalThis.window; });
  globalThis.window = { ethereum: { request: async (call) => {
    calls.push(call);
    throw Object.assign(new Error('User rejected'), { code: 4001 });
  } } };
  await assert.rejects(addRobinhoodNetwork(), /User rejected/);
  assert.equal(calls.length, 1);
});

test('missing wallet reports a useful error', async (t) => {
  t.after(() => { delete globalThis.window; });
  globalThis.window = {};
  await assert.rejects(addRobinhoodNetwork(), /NO_WALLET/);
});
