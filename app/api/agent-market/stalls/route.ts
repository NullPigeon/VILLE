import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { marketService } from '@/lib/market-services';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';
import { hasMarketHolderAccess, readAgentMarketSkills } from '@/lib/server/agent-market';
import { field } from '@/lib/server/validation';

export const runtime = 'nodejs';

type DraftRow = { id: string; slot: number; base_service_id: string; title: string; description: string;
  instructions: string; created_at: string; updated_at: string };

function publicDraft(row: DraftRow) {
  return { id: row.id, slot: row.slot, baseServiceId: row.base_service_id, title: row.title,
    description: row.description, instructions: row.instructions, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function ownDrafts(owner: string) {
  return database<DraftRow[]>(`landville_market_stall_drafts?select=id,slot,base_service_id,title,description,instructions,created_at,updated_at&owner_wallet=eq.${owner}&order=slot.asc`);
}

export async function GET(request: NextRequest) {
  try {
    const owner = requireWallet(request);
    await readAgentMarketSkills(owner);
    const drafts = await ownDrafts(owner);
    return NextResponse.json({ drafts: drafts.map(publicDraft) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['baseServiceId', 'title', 'description', 'instructions'].includes(key))) throw new ApiError(400, 'Invalid service draft.');
    const baseServiceId = field(body, 'baseServiceId', 1, 64);
    const base = marketService(baseServiceId);
    if (!base || !['model', 'long-form', 'research-brief'].includes(base.kind)) throw new ApiError(400, 'Choose a supported model or research service.');
    const title = field(body, 'title', 3, 80);
    const description = field(body, 'description', 10, 280);
    const instructions = field(body, 'instructions', 10, 1000);
    await readAgentMarketSkills(owner);
    const holder = await hasMarketHolderAccess(owner).catch(() => false);
    if (base.holderOnly && !holder) throw new ApiError(403, 'Hold at least 1 million SCRAPY to draft a service using this model.');
    await enforceRate(owner, 'market-stall-draft', 5);
    const drafts = await ownDrafts(owner);
    const maxSlots = holder ? 10 : 3;
    const slot = Array.from({ length: maxSlots }, (_, index) => index + 1).find((index) => !drafts.some((draft) => draft.slot === index));
    if (!slot) throw new ApiError(409, `You have used all ${maxSlots} service draft slots.`);
    const rows = await database<DraftRow[]>('landville_market_stall_drafts', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ id: randomUUID(), owner_wallet: owner.toLowerCase(), slot, base_service_id: base.id,
        title, description, instructions }),
    });
    return NextResponse.json({ draft: publicDraft(rows[0]) }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).length !== 1 || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) throw new ApiError(400, 'Choose a service draft to remove.');
    await readAgentMarketSkills(owner);
    await enforceRate(owner, 'market-stall-draft', 5);
    await database(`landville_market_stall_drafts?id=eq.${encodeURIComponent(body.id)}&owner_wallet=eq.${owner}`, { method: 'DELETE' });
    return NextResponse.json({ removed: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
