import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { actOnMission, missionNoStore, recentMissions, startMission } from '@/lib/server/agent-missions';
import { database, enforceRate } from '@/lib/server/database';

export const runtime = 'nodejs';

async function present(owner: string) {
  const missions = await recentMissions(owner);
  const jobs = missions.filter((mission) => mission.job_id).map((mission) => mission.job_id!);
  const stalls = missions.filter((mission) => mission.stall_id).map((mission) => mission.stall_id!);
  const [jobRows, stallRows, offerRows] = await Promise.all([
    jobs.length ? database<Array<{ id: string; title: string; brief: string; status: string; winning_offer_id: string | null;
      transaction_hash: string | null; paid_micro: number | null; rating: number | null; completed_at: string | null }>>(
      `landville_agent_jobs?select=id,title,brief,status,winning_offer_id,transaction_hash,paid_micro,rating,completed_at&id=in.(${jobs.join(',')})`) : Promise.resolve([]),
    stalls.length ? database<Array<{ id: string; title: string; status: string }>>(
      `landville_market_stall_drafts?select=id,title,status&id=in.(${stalls.join(',')})&owner_wallet=eq.${owner}`) : Promise.resolve([]),
    jobs.length ? database<Array<{ id: string; job_id: string; stall_id: string }>>(
      `landville_agent_job_offers?select=id,job_id,stall_id&job_id=in.(${jobs.join(',')})&seller_wallet=eq.${owner}`) : Promise.resolve([]),
  ]);
  return missions.map((mission) => {
    const job = jobRows.find((row) => row.id === mission.job_id);
    const offer = offerRows.find((row) => row.job_id === mission.job_id && row.stall_id === mission.stall_id);
    const outcome = mission.status !== 'offer_submitted' || !job ? null : job.status === 'open' ? { state: 'waiting' } :
      job.status === 'cancelled' ? { state: 'cancelled' } : job.winning_offer_id === offer?.id ? {
        state: 'delivered', transaction: job.transaction_hash, paidMicro: job.paid_micro,
        rating: job.rating, completedAt: job.completed_at,
      } : { state: 'not_selected' };
    return { id: mission.id, status: mission.status, goal: mission.goal,
      reason: mission.reason, events: mission.events, createdAt: mission.created_at,
      plan: mission.plan, stepIndex: mission.step_index, attempts: mission.attempts,
      job: job ? { id: job.id, title: job.title, brief: job.brief, status: job.status } : null,
      service: stallRows.find((stall) => stall.id === mission.stall_id) || null, outcome };
  });
}

async function budget(owner: string) {
  const day = new Date().toISOString().slice(0, 10);
  const rows = await database<Array<{ calls: number; reserved_micro_usd: number; actual_micro_usd: number }>>(
    `landville_agent_mission_ai_budget?select=calls,reserved_micro_usd,actual_micro_usd&owner_wallet=eq.${owner}&utc_day=eq.${day}&limit=1`);
  return { calls: rows[0]?.calls || 0, reservedUsd: (rows[0]?.reserved_micro_usd || 0) / 1_000_000,
    actualUsd: (rows[0]?.actual_micro_usd || 0) / 1_000_000,
    dailyCalls: Number(process.env.LANDVILLE_AGENT_MISSION_DAILY_CALLS || 3),
    dailyUsd: Number(process.env.LANDVILLE_AGENT_MISSION_DAILY_USD || 0) };
}

export async function GET(request: NextRequest) {
  if (process.env.LANDVILLE_AGENT_MISSIONS_ENABLED !== 'true') return NextResponse.json({ available: false, missions: [], aiBudget: null }, { headers: missionNoStore });
  try { const owner = requireWallet(request); const [missions, aiBudget] = await Promise.all([present(owner), budget(owner)]);
    return NextResponse.json({ available: true, missions, aiBudget }, { headers: missionNoStore }); }
  catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    if (process.env.LANDVILLE_AGENT_MISSIONS_ENABLED !== 'true') throw new ApiError(503, 'Robot missions are not enabled yet.');
    const body = await jsonBody(request);
    if (body.action === 'start' && Object.keys(body).length === 1) {
      await enforceRate(owner, 'agent-mission-start', 3);
      await startMission(owner);
      return NextResponse.json({ available: true, missions: await present(owner), aiBudget: await budget(owner) }, { status: 201, headers: missionNoStore });
    }
    if ((body.action === 'approve' || body.action === 'cancel') && Object.keys(body).length === 2 && typeof body.id === 'string') {
      await actOnMission(owner, body.id, body.action);
      return NextResponse.json({ available: true, missions: await present(owner), aiBudget: await budget(owner) }, { headers: missionNoStore });
    }
    throw new ApiError(400, 'Choose a mission action.');
  } catch (error) { return apiFailure(error); }
}
