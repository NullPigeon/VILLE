import { NextRequest, NextResponse } from 'next/server';
import { AGENT_HOUSES, AGENT_INTERVALS, AGENT_PERSONALITIES, AGENT_PRESENTATIONS, AGENT_TOWN_MODES } from '@/lib/personal-agent';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, enforceRate, rpc } from '@/lib/server/database';
import { agentRecord, readPersonalAgent, type AgentRow } from '@/lib/server/personal-agents';

export async function GET(request: NextRequest) {
  try {
    const owner = requireWallet(request);
    return NextResponse.json({
      agent: await readPersonalAgent(owner),
      autonomyAvailable: process.env.LANDVILLE_AGENT_AUTONOMY_ENABLED === 'true',
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function PUT(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    const keys = ['name', 'presentation', 'personality', 'houseStyle', 'houseName', 'townMode', 'intervalMinutes'];
    if (Object.keys(body).some((key) => !keys.includes(key))) throw new ApiError(400, 'Unsupported robot setting.');
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    const houseName = typeof body.houseName === 'string' ? body.houseName.trim().replace(/\s+/g, ' ') : '';
    if (!/^[\p{L}\p{N} _-]{2,24}$/u.test(name) || !/^[\p{L}\p{N} _-]{2,32}$/u.test(houseName)) {
      throw new ApiError(400, 'Robot and house names need 2–24 or 2–32 letters, numbers, spaces, dashes or underscores.');
    }
    if (/^(scrapy|mayor|system|admin)(\b|\s|$)/i.test(name)) throw new ApiError(400, 'Choose a name that does not impersonate a town official.');
    if (!AGENT_PRESENTATIONS.includes(body.presentation as typeof AGENT_PRESENTATIONS[number])
      || !AGENT_PERSONALITIES.includes(body.personality as typeof AGENT_PERSONALITIES[number])
      || !AGENT_HOUSES.includes(body.houseStyle as typeof AGENT_HOUSES[number])
      || !AGENT_TOWN_MODES.includes(body.townMode as typeof AGENT_TOWN_MODES[number])
      || !AGENT_INTERVALS.includes(body.intervalMinutes as typeof AGENT_INTERVALS[number])) {
      throw new ApiError(400, 'Choose available robot, house and Town settings.');
    }
    await assertCitizen(owner);
    await enforceRate(owner, 'personal-agent-settings', 5);
    const row = await rpc<AgentRow>('landville_upsert_personal_agent', {
      p_owner: owner, p_name: name, p_presentation: body.presentation,
      p_personality: body.personality, p_house_style: body.houseStyle,
      p_house_name: houseName, p_town_mode: body.townMode,
      p_interval_minutes: body.intervalMinutes,
    });
    return NextResponse.json({ agent: agentRecord(row) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
