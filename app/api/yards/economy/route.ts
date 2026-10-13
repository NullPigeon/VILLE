import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate, rpc } from '@/lib/server/database';
import { readPersonalAgent } from '@/lib/server/personal-agents';
import { YARD_ACTIONS, yardEnergy, yardUpgradeCost, type YardEconomy, type YardResourceRow, type YardShift } from '@/lib/yard-economy';

const headers = { 'Cache-Control': 'private, no-store' };

async function state(owner: string): Promise<YardEconomy> {
  const agent = await readPersonalAgent(owner);
  if (!agent) throw new ApiError(404, 'Build your personal agent first.');
  const [resources, shifts] = await Promise.all([
    database<YardResourceRow[]>(`landville_yard_resources?select=*&owner_wallet=eq.${owner}&limit=1`),
    database<YardShift[]>(`landville_yard_shifts?select=request_id,action,energy_spent,materials_delta,created_at&owner_wallet=eq.${owner}&order=created_at.desc&limit=12`),
  ]);
  const row = resources[0] || { owner_wallet: owner, energy: 8, materials: 0, house_level: 0, energy_at: new Date().toISOString() };
  const energy = yardEnergy(row, agent.yardFeature);
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  return { ...energy, capacity: 12, materials: row.materials, houseLevel: row.house_level,
    dailyShifts: shifts.filter((shift) => shift.action !== 'UPGRADE' && new Date(shift.created_at) >= dayStart).length,
    upgradeCost: yardUpgradeCost(row.house_level), shifts };
}

export async function GET(request: NextRequest) {
  try { return NextResponse.json({ economy: await state(requireWallet(request)) }, { headers }); }
  catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['action', 'requestId'].includes(key)) ||
      typeof body.action !== 'string' || ![...YARD_ACTIONS.map((item) => item.id), 'UPGRADE'].includes(body.action) ||
      typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
      throw new ApiError(400, 'Choose a yard shift and a valid request ID.');
    }
    await assertCitizen(owner);
    await enforceRate(owner, 'yard-shift', 12);
    await rpc<YardResourceRow>('landville_yard_shift', { p_owner: owner, p_request_id: body.requestId, p_action: body.action });
    return NextResponse.json({ economy: await state(owner) }, { headers });
  } catch (error) { return apiFailure(error); }
}
