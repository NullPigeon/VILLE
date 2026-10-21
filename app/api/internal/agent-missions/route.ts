import { NextRequest, NextResponse } from 'next/server';
import { apiFailure } from '@/lib/server/api';
import { requireWorker } from '@/lib/server/builds';
import { processNextMission, resumeApprovedOffer } from '@/lib/server/agent-missions';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    requireWorker(request);
    if (process.env.LANDVILLE_AGENT_MISSIONS_ENABLED !== 'true') {
      return NextResponse.json({ reason: 'disabled' }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const mission = await processNextMission() || await resumeApprovedOffer();
    return NextResponse.json({ reason: mission ? mission.status : 'no_due_mission', missionId: mission?.id || null },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
