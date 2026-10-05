import { NextRequest, NextResponse } from 'next/server';
import { apiFailure } from '@/lib/server/api';
import { requireWorker, workerActor } from '@/lib/server/builds';
import { payNextCreatorReward, refreshTreasuryCycle } from '@/lib/server/treasury';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    requireWorker(request);
    const refresh = await refreshTreasuryCycle();
    const payout = await payNextCreatorReward(workerActor());
    return NextResponse.json({ refresh, payout }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
