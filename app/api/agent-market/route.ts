import { NextRequest, NextResponse } from 'next/server';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, FUTURE_STALLS, MARKET_CURRENCY, MARKET_NETWORK, validateAgentSkills } from '@/lib/agent-market';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';
import { hasMarketHolderAccess, readAgentMarketSkills } from '@/lib/server/agent-market';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const catalogue = { skills: AGENT_SKILLS, futureStalls: FUTURE_STALLS, basicSlotLimit: BASIC_SLOT_LIMIT, network: MARKET_NETWORK, currency: MARKET_CURRENCY };
  try {
    const owner = requireWallet(request);
    const selected = await readAgentMarketSkills(owner);
    let holder = false;
    let holderCheckAvailable = true;
    try { holder = await hasMarketHolderAccess(owner); }
    catch { holderCheckAvailable = false; }
    return NextResponse.json({ ...catalogue, selected, holder, holderCheckAvailable, agentExists: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      return NextResponse.json({ ...catalogue, selected: [], holder: false, holderCheckAvailable: true, agentExists: false }, { headers: { 'Cache-Control': 'no-store' } });
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
