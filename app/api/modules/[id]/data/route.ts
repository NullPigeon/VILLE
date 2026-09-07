import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate } from '@/lib/server/database';
import { proposalId } from '@/lib/server/validation';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import { readCityModule } from '@/lib/server/city-module';
import { citizenIdentities } from '@/lib/server/citizens';
import { citizenLabel } from '@/lib/citizen-identity';
import type { CityModule, ModuleStorageMode } from '@/lib/build-contract';

const MAX_UPSTREAM_BYTES = 750_000;
const MAX_RPC_BYTES = 64_000;
const MAX_STORAGE_DATA_BYTES = 10_000;

type PublishedObject = { proposal_id: string; artifact_path?: string; artifact_hash?: string };
type SharedRecord = { id: string; owner_wallet: string; data: Record<string, unknown>; created_at: string; updated_at: string };

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

function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new ApiError(400, 'Unsupported storage input.');
}

function collection(value: unknown) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(value)) throw new ApiError(400, 'Invalid storage collection.');
  return value;
}

function recordId(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new ApiError(400, 'Invalid shared record ID.');
  return value.toLowerCase();
}

function storageData(value: unknown) {
  const data = object(value, 'storage data');
  if (JSON.stringify(data).length > MAX_STORAGE_DATA_BYTES) throw new ApiError(413, 'Storage data is too large.');
  return data;
}

function requireStorageDeclaration(module: CityModule, name: string, mode: ModuleStorageMode) {
  if (!module.capabilities?.storage.some((item) => item.name === name && item.mode === mode)) throw new ApiError(403, 'This module did not declare that storage permission.');
}

async function verifiedModule(id: string, published: PublishedObject) {
  if (!published.artifact_path || !published.artifact_hash) throw new ApiError(503, 'Published module permissions are unavailable.');
  const artifact = await readCityModule(id, published.artifact_path);
  if (artifact.hash !== published.artifact_hash) throw new ApiError(503, 'The deployed module does not match its published permissions.');
  return artifact.module;
}

async function moduleStorageResponse(id: string, wallet: string, input: Record<string, unknown>, published: PublishedObject) {
  const operation = input.operation;
  if (typeof operation !== 'string') throw new ApiError(400, 'Invalid storage operation.');
  const name = collection(input.collection);
  const cityModule = await verifiedModule(id, published);
  const base = { module_id: id, collection: name };

  if (operation.startsWith('private.')) {
    requireStorageDeclaration(cityModule, name, 'private');
    if (operation === 'private.get') {
      exactKeys(input, ['operation', 'collection']);
      const rows = await database<Array<{ data: Record<string, unknown>; updated_at: string }>>(`landville_module_private_state?select=data,updated_at&module_id=eq.${id}&collection=eq.${name}&citizen_wallet=eq.${wallet}&limit=1`);
      return NextResponse.json({ value: rows[0]?.data ?? null, updatedAt: rows[0]?.updated_at ?? null }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (operation === 'private.set') {
      exactKeys(input, ['operation', 'collection', 'data']);
      const rows = await database<Array<{ data: Record<string, unknown>; updated_at: string }>>('landville_module_private_state?on_conflict=module_id,collection,citizen_wallet', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ ...base, citizen_wallet: wallet, data: storageData(input.data), updated_at: new Date().toISOString() }),
      });
      return NextResponse.json({ value: rows[0].data, updatedAt: rows[0].updated_at }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (operation === 'private.delete') {
      exactKeys(input, ['operation', 'collection']);
      await database(`landville_module_private_state?module_id=eq.${id}&collection=eq.${name}&citizen_wallet=eq.${wallet}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return NextResponse.json({ deleted: true }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
  }

  if (operation.startsWith('shared.')) {
    requireStorageDeclaration(cityModule, name, 'shared');
    if (operation === 'shared.list') {
      exactKeys(input, ['operation', 'collection', 'limit']);
      const limit = input.limit === undefined ? 25 : Number(input.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new ApiError(400, 'Shared record limit must be 1–50.');
      const rows = await database<SharedRecord[]>(`landville_module_shared_records?select=id,owner_wallet,data,created_at,updated_at&module_id=eq.${id}&collection=eq.${name}&order=created_at.desc&limit=${limit}`);
      const authors = await citizenIdentities(rows.map((row) => row.owner_wallet));
      return NextResponse.json({ records: rows.map((row) => { const author = authors.get(row.owner_wallet); return { id: row.id, data: row.data, createdAt: row.created_at, updatedAt: row.updated_at, author: { username: author?.username ?? null, citizenNumber: author?.citizenNumber ?? null, label: citizenLabel(author) }, ownedByViewer: row.owner_wallet === wallet }; }) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (operation === 'shared.create') {
      exactKeys(input, ['operation', 'collection', 'data']);
      const row = await database<SharedRecord>('rpc/landville_create_module_shared_record', { method: 'POST', body: JSON.stringify({ p_module_id: id, p_collection: name, p_owner_wallet: wallet, p_data: storageData(input.data) }) });
      return NextResponse.json({ record: { id: row.id, data: row.data, createdAt: row.created_at, updatedAt: row.updated_at, ownedByViewer: true } }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (operation === 'shared.update') {
      exactKeys(input, ['operation', 'collection', 'id', 'data']);
      const idValue = recordId(input.id);
      const rows = await database<SharedRecord[]>(`landville_module_shared_records?id=eq.${idValue}&module_id=eq.${id}&collection=eq.${name}&owner_wallet=eq.${wallet}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ data: storageData(input.data), updated_at: new Date().toISOString() }) });
      if (!rows[0]) throw new ApiError(404, 'Shared record not found or not owned by this citizen.');
      return NextResponse.json({ record: { id: rows[0].id, data: rows[0].data, createdAt: rows[0].created_at, updatedAt: rows[0].updated_at, ownedByViewer: true } }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (operation === 'shared.delete') {
      exactKeys(input, ['operation', 'collection', 'id']);
      const idValue = recordId(input.id);
      const rows = await database<SharedRecord[]>(`landville_module_shared_records?select=id&id=eq.${idValue}&module_id=eq.${id}&collection=eq.${name}&owner_wallet=eq.${wallet}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      if (!rows[0]) throw new ApiError(404, 'Shared record not found or not owned by this citizen.');
      return NextResponse.json({ deleted: true }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
  }

  if (operation.startsWith('counter.')) {
    requireStorageDeclaration(cityModule, name, 'counter');
    exactKeys(input, ['operation', 'collection']);
    if (operation === 'counter.get') {
      const rows = await database<Array<{ value: number; updated_at: string }>>(`landville_module_counters?select=value,updated_at&module_id=eq.${id}&collection=eq.${name}&limit=1`);
      return NextResponse.json({ value: rows[0]?.value ?? 0, updatedAt: rows[0]?.updated_at ?? null }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (operation === 'counter.increment') {
      const value = await database<number>('rpc/landville_increment_module_counter', { method: 'POST', body: JSON.stringify({ p_module_id: id, p_collection: name }) });
      return NextResponse.json({ value }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
  }
  throw new ApiError(400, 'Unsupported storage operation.');
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
  if (!['market.dexscreener', 'chain.robinhood', 'module.storage'].includes(String(body.capability))) throw new ApiError(400, 'Unsupported module capability.');
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
    const objects = await database<PublishedObject[]>(`landville_objects?select=proposal_id,artifact_path,artifact_hash&proposal_id=eq.${id}&limit=1`);
    if (!objects[0]) throw new ApiError(404, 'Published module not found.');
    await enforceRate(wallet, 'module-data', 40);
    const { capability, input } = capabilityInput(await jsonBody(request));
    if (capability === 'module.storage') return await moduleStorageResponse(id, wallet, input, objects[0]);
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
