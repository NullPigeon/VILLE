import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database } from '@/lib/server/database';
import { proposalId } from '@/lib/server/validation';

const MAX_UPSTREAM_BYTES = 750_000;

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    const id = proposalId((await params).id);
    const objects = await database<Array<{ proposal_id: string }>>(`landville_objects?select=proposal_id&proposal_id=eq.${id}&limit=1`);
    if (!objects[0]) throw new ApiError(404, 'Published module not found.');
    const url = marketUrl(await jsonBody(request));
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
