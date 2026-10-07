import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { marketService } from '@/lib/market-services';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';
import { hasMarketHolderAccess, readAgentMarketSkills } from '@/lib/server/agent-market';
import { field } from '@/lib/server/validation';
import { getMarketPaymentServer, marketPaymentsConfigured } from '@/lib/server/market-x402';
import { marketOrderStorageReady } from '@/lib/server/market-orders';
import { marketServiceConfigured } from '@/lib/server/market-catalog';
import { sellerAmounts, sellerPayoutReady, sellerWallet } from '@/lib/server/market-economy';

export const runtime = 'nodejs';

type DraftRow = { id: string; slot: number; base_service_id: string; title: string; description: string;
  instructions: string; status: 'draft' | 'published'; markup_micro: number; published_at: string | null;
  owner_wallet: string; created_at: string; updated_at: string };

function publicDraft(row: DraftRow) {
  return { id: row.id, slot: row.slot, baseServiceId: row.base_service_id, title: row.title,
    description: row.description, instructions: row.instructions, status: row.status, markupMicro: row.markup_micro,
    publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function ownDrafts(owner: string) {
  return database<DraftRow[]>(`landville_market_stall_drafts?select=id,owner_wallet,slot,base_service_id,title,description,instructions,status,markup_micro,published_at,created_at,updated_at&owner_wallet=eq.${owner}&order=slot.asc`);
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get('public') === '1') {
      if (!sellerPayoutReady() || !marketPaymentsConfigured() ||
        !await getMarketPaymentServer().then(() => true).catch(() => false)) {
        return NextResponse.json({ stalls: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const rows = await database<DraftRow[]>(
        'landville_market_stall_drafts?select=id,owner_wallet,slot,base_service_id,title,description,status,markup_micro,published_at,updated_at&status=eq.published&order=published_at.desc&limit=100');
      return NextResponse.json({ stalls: rows.flatMap((row) => {
        const base = marketService(row.base_service_id);
        if (!base || !marketServiceConfigured(base)) return [];
        try { return [{ id: row.id, seller: row.owner_wallet, title: row.title, description: row.description,
          baseName: base.name, category: base.category, priceUsd: sellerAmounts(base.priceUsd, row.markup_micro).priceUsd,
          endpoint: `/api/agent-market/stalls/${row.id}/buy` }]; } catch { return []; }
      }) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const owner = requireWallet(request);
    await readAgentMarketSkills(owner);
    const drafts = await ownDrafts(owner);
    return NextResponse.json({ drafts: drafts.map(publicDraft) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['id', 'publish', 'markupUsd'].includes(key)) ||
      typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.publish !== 'boolean') {
      throw new ApiError(400, 'Choose a saved service and whether to publish it.');
    }
    await enforceRate(owner, 'market-stall-publish', 8);
    const draft = (await ownDrafts(owner)).find((row) => row.id === body.id);
    if (!draft) throw new ApiError(404, 'Service draft not found.');
    if (body.publish) {
      if (draft.status === 'published') throw new ApiError(409, 'Unpublish this service before changing its price.');
      const base = marketService(draft.base_service_id);
      if (!base || !marketServiceConfigured(base) || !marketPaymentsConfigured() || !await marketOrderStorageReady() || !sellerPayoutReady() ||
        !await getMarketPaymentServer().then(() => true).catch(() => false)) {
        throw new ApiError(503, 'City checkout, the foundation service, or seller payouts are not open yet.');
      }
      if (base.holderOnly && !await hasMarketHolderAccess(owner)) throw new ApiError(403, 'Hold at least 1M SCRAPY to sell a premium-model service.');
      await sellerWallet(owner);
      if (typeof body.markupUsd !== 'string' || !/^\d+(\.\d{1,6})?$/.test(body.markupUsd)) throw new ApiError(400, 'Enter a markup in USDG.');
      const markupMicro = Math.round(Number(body.markupUsd) * 1_000_000);
      sellerAmounts(base.priceUsd, markupMicro);
      const rows = await database<DraftRow[]>(`landville_market_stall_drafts?id=eq.${draft.id}&owner_wallet=eq.${owner}&status=eq.draft`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'published', markup_micro: markupMicro,
          published_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      if (!rows.length) throw new ApiError(409, 'Service changed. Refresh and try again.');
      return NextResponse.json({ draft: publicDraft(rows[0]) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const rows = await database<DraftRow[]>(`landville_market_stall_drafts?id=eq.${draft.id}&owner_wallet=eq.${owner}&status=eq.published`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'draft', published_at: null,
        updated_at: new Date().toISOString() }) });
    if (!rows.length) throw new ApiError(409, 'Service is not published.');
    return NextResponse.json({ draft: publicDraft(rows[0]) }, { headers: { 'Cache-Control': 'private, no-store' } });
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
    const draft = (await ownDrafts(owner)).find((row) => row.id === body.id);
    if (!draft) throw new ApiError(404, 'Service draft not found.');
    if (draft?.status === 'published') throw new ApiError(409, 'Unpublish this service before removing it.');
    const sales = await database<Array<{ authorization_hash: string }>>(
      `landville_market_sales?select=authorization_hash&stall_id=eq.${body.id}&limit=1`);
    if (sales.length) throw new ApiError(409, 'This service has sales history. Keep it unpublished so receipts stay available.');
    await database(`landville_market_stall_drafts?id=eq.${encodeURIComponent(body.id)}&owner_wallet=eq.${owner}`, { method: 'DELETE' });
    return NextResponse.json({ removed: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
