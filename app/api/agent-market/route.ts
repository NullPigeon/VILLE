import { NextRequest, NextResponse } from 'next/server';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, FUTURE_STALLS, MARKET_CURRENCY, MARKET_NETWORK, validateAgentSkills } from '@/lib/agent-market';
import { MARKET_SERVICES } from '@/lib/market-services';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';
import { hasMarketHolderAccess, readAgentMarketSkills } from '@/lib/server/agent-market';
import { getMarketPaymentServer, marketPaymentsConfigured } from '@/lib/server/market-x402';
import { marketOrderStorageReady } from '@/lib/server/market-orders';
import { publicMarketService } from '@/lib/server/market-catalog';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('directory') === '1') {
    try {
      const agents = await database<Array<{ id: string; owner_wallet: string; name: string; description: string; capabilities: string[]; last_seen_at: string }>>(
        'landville_linked_agents?select=id,owner_wallet,name,description,capabilities,last_seen_at&last_seen_at=not.is.null&order=last_seen_at.desc&limit=100',
      );
      return NextResponse.json({ agents: agents.map((agent) => ({ id: agent.id, ownerWallet: agent.owner_wallet, name: agent.name, description: agent.description, capabilities: agent.capabilities, connectedAt: agent.last_seen_at })) }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    } catch (error) { return apiFailure(error); }
  }
  const paymentsReady = marketPaymentsConfigured() && await marketOrderStorageReady() &&
    await getMarketPaymentServer().then(() => true).catch(() => false);
  const catalogue = { skills: AGENT_SKILLS, futureStalls: FUTURE_STALLS, basicSlotLimit: BASIC_SLOT_LIMIT, network: MARKET_NETWORK, currency: MARKET_CURRENCY };
  try {
    const owner = requireWallet(request);
    const selected = await readAgentMarketSkills(owner);
    let holder = false;
    let holderCheckAvailable = true;
    try { holder = await hasMarketHolderAccess(owner); }
    catch { holderCheckAvailable = false; }
    return NextResponse.json({ ...catalogue, paidServices: MARKET_SERVICES.map((service) => publicMarketService(service, paymentsReady, holder)),
      selected, holder, holderCheckAvailable, agentExists: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      return NextResponse.json({ ...catalogue, paidServices: MARKET_SERVICES.map((service) => publicMarketService(service, paymentsReady, false)),
        selected: [], holder: false, holderCheckAvailable: true, agentExists: false }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return apiFailure(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).length !== 1 || !Object.hasOwn(body, 'selected')) throw new ApiError(400, 'Choose basic skills to equip.');
    let selected;
    try { selected = validateAgentSkills(body.selected); }
    catch { throw new ApiError(400, 'Choose up to three different basic skills.'); }
    await readAgentMarketSkills(owner);
    await enforceRate(owner, 'agent-market-loadout', 5);
    const rows = await database<Array<{ market_skills: string[] }>>(
      `landville_personal_agents?owner_wallet=eq.${encodeURIComponent(owner)}&select=market_skills`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ market_skills: selected }) },
    );
    if (!rows.length) throw new ApiError(404, 'Build your robot first.');
    return NextResponse.json({ selected: rows[0].market_skills }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
