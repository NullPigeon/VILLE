import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, enforceRate, rpc } from '@/lib/server/database';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'private, no-store' };
type Agent = { id: string; name: string };
type Budget = { agent_id: string; enabled: boolean; daily_limit_micro: number; allow_landville: boolean;
  allow_citizens: boolean; allow_merchants: boolean };

export async function GET(request: NextRequest) {
  try {
    const owner = requireWallet(request);
    const agents = await database<Agent[]>(`landville_linked_agents?select=id,name&owner_wallet=eq.${owner}&order=created_at.asc&limit=5`);
    const budgets = await database<Budget[]>(`landville_market_agent_budgets?select=agent_id,enabled,daily_limit_micro,allow_landville,allow_citizens,allow_merchants&owner_wallet=eq.${owner}&limit=5`);
    const spends = await rpc<Array<{ agent_id: string; used_micro: number | string }>>(
      'landville_market_agent_usage', { p_owner: owner });
    return NextResponse.json({ agents: agents.map((agent) => {
      const budget = budgets.find((item) => item.agent_id === agent.id);
      return { ...agent, enabled: budget?.enabled || false, dailyLimitMicro: budget?.daily_limit_micro || 0,
        allowLandville: budget?.allow_landville || false, allowCitizens: budget?.allow_citizens || false,
        allowMerchants: budget?.allow_merchants || false,
        usedTodayMicro: Number(spends.find((item) => item.agent_id === agent.id)?.used_micro || 0) };
    }) }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}

export async function PUT(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['agentId', 'enabled', 'dailyLimitUsd', 'allowLandville', 'allowCitizens', 'allowMerchants'].includes(key)) ||
      typeof body.agentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.agentId) || typeof body.enabled !== 'boolean' ||
      typeof body.dailyLimitUsd !== 'string' || !/^\d+(\.\d{1,6})?$/.test(body.dailyLimitUsd) ||
      typeof body.allowLandville !== 'boolean' || typeof body.allowCitizens !== 'boolean' || typeof body.allowMerchants !== 'boolean') {
      throw new ApiError(400, 'Set an agent, a daily USDG limit and the allowed service types.');
    }
    const limit = parseUnits(body.dailyLimitUsd, 6);
    if (limit < 0n || limit > 2_000_000n || (body.enabled && (limit < 10_000n ||
      !(body.allowLandville || body.allowCitizens || body.allowMerchants)))) throw new ApiError(400, 'Enabled agents need a 0.01–2 USDG daily limit and one allowed service type.');
    const agent = await database<Agent[]>(`landville_linked_agents?select=id,name&id=eq.${body.agentId}&owner_wallet=eq.${owner}&limit=1`);
    if (!agent.length) throw new ApiError(404, 'Connected agent not found.');
    await enforceRate(owner, 'market-agent-budget', 10);
    await database('landville_market_agent_budgets?on_conflict=agent_id', { method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ agent_id: agent[0].id, owner_wallet: owner, enabled: body.enabled,
        daily_limit_micro: Number(limit), allow_landville: body.allowLandville,
        allow_citizens: body.allowCitizens, allow_merchants: body.allowMerchants, updated_at: new Date().toISOString() }) });
    return NextResponse.json({ saved: true }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}
