import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate } from '@/lib/server/database';
import { proposalId } from '@/lib/server/validation';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

const MAX_UPSTREAM_BYTES = 750_000;
const MAX_RPC_BYTES = 64_000;

function segment(value: unknown, name: string, max = 500) {
  if (typeof value !== 'string' || value.length < 1 || value.length > max || !/^[A-Za-z0-9:_.-]+(?:,[A-Za-z0-9:_.-]+)*$/.test(value)) {
    throw new ApiError(400, `Invalid ${name}.`);
  }
  return value;
}

function marketUrl(body: Record<string, unknown>) {
  const operation = body.operation;
  if (operation === 'search') {
    if (typeof body.query !== 'string' || body.query.trim().length < 2 || body.query.length > 100) throw new ApiError(400, 'Invalid market search.');
    const url = new URL('https://api.dexscreener.com/latest/dex/search');
    url.searchParams.set('q', body.query.trim());
    return url;
  }
  const chainId = segment(body.chainId, 'chain ID', 40);
  const address = segment(body.address, 'market address');
  if (operation === 'pair') return new URL(`https://api.dexscreener.com/latest/dex/pairs/${chainId}/${address}`);
  if (operation === 'tokenPairs') return new URL(`https://api.dexscreener.com/token-pairs/v1/${chainId}/${address}`);
  if (operation === 'tokens') return new URL(`https://api.dexscreener.com/tokens/v1/${chainId}/${address}`);
  throw new ApiError(400, 'Unsupported market operation.');
}

function object(value: unknown, name: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, `Invalid ${name}.`);
  return value as Record<string, unknown>;
}

function evmAddress(value: unknown, name: string) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new ApiError(400, `Invalid ${name}.`);
  return value.toLowerCase();
}

function callData(value: unknown) {
  if (typeof value !== 'string' || value.length > 16_386 || !/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) throw new ApiError(400, 'Invalid contract call data.');
  return value.toLowerCase();
}

function capabilityInput(body: Record<string, unknown>) {
  if (!('capability' in body)) return { capability: 'market.dexscreener', input: body };
  if (!['market.dexscreener', 'chain.robinhood'].includes(String(body.capability))) throw new ApiError(400, 'Unsupported module capability.');
  return { capability: String(body.capability), input: object(body.input, 'capability input') };
}

async function chainResponse(body: Record<string, unknown>) {
  let method: 'eth_blockNumber' | 'eth_getBalance' | 'eth_getCode' | 'eth_call';
  let params: unknown[];
  if (body.operation === 'blockNumber') { method = 'eth_blockNumber'; params = []; }
  else if (body.operation === 'nativeBalance') { method = 'eth_getBalance'; params = [evmAddress(body.address, 'account address'), 'latest']; }
  else if (body.operation === 'bytecode') { method = 'eth_getCode'; params = [evmAddress(body.address, 'contract address'), 'latest']; }
  else if (body.operation === 'ethCall') {
    method = 'eth_call';
    params = [{ to: evmAddress(body.to, 'contract address'), data: callData(body.data) }, 'latest'];
  } else throw new ApiError(400, 'Unsupported chain operation.');

  const upstream = await fetch(process.env.ROBINHOOD_MAINNET_RPC_URL || activeRobinhoodChain.rpcUrl, {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok || !upstream.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new ApiError(502, 'Robinhood mainnet is unavailable.');
  const declared = Number(upstream.headers.get('content-length') || 0);
  if (declared > MAX_RPC_BYTES) throw new ApiError(502, 'Chain response is too large.');
  const text = await upstream.text();
  if (text.length > MAX_RPC_BYTES) throw new ApiError(502, 'Chain response is too large.');
  let data: { result?: unknown; error?: unknown };
  try { data = object(JSON.parse(text), 'chain response'); } catch (error) {
    if (error instanceof ApiError) throw new ApiError(502, 'Robinhood mainnet returned invalid data.');
    throw new ApiError(502, 'Robinhood mainnet returned invalid data.');
  }
  if (data.error || typeof data.result !== 'string' || !/^0x[0-9a-fA-F]*$/.test(data.result)) throw new ApiError(502, 'Robinhood mainnet could not complete the read.');
  return NextResponse.json({ source: activeRobinhoodChain.name, chainId: activeRobinhoodChain.id, fetchedAt: new Date().toISOString(), result: data.result }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    const id = proposalId((await params).id);
    const objects = await database<Array<{ proposal_id: string }>>(`landville_objects?select=proposal_id&proposal_id=eq.${id}&limit=1`);
    if (!objects[0]) throw new ApiError(404, 'Published module not found.');
    await enforceRate(wallet, 'module-data', 40);
    const { capability, input } = capabilityInput(await jsonBody(request));
    if (capability === 'chain.robinhood') return await chainResponse(input);
    const url = marketUrl(input);
    const upstream = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000) });
    if (!upstream.ok || !upstream.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new ApiError(502, 'Live market source is unavailable.');
    const declared = Number(upstream.headers.get('content-length') || 0);
    if (declared > MAX_UPSTREAM_BYTES) throw new ApiError(502, 'Live market response is too large.');
    const text = await upstream.text();
    if (text.length > MAX_UPSTREAM_BYTES) throw new ApiError(502, 'Live market response is too large.');
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new ApiError(502, 'Live market source returned invalid data.'); }
    return NextResponse.json({ source: 'DEX Screener', fetchedAt: new Date().toISOString(), data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
