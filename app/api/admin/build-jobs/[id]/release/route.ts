import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { publishVerifiedBuild } from '@/lib/server/build-release';
import { enforceRate } from '@/lib/server/database';
import { proposalId } from '@/lib/server/validation';

export const maxDuration = 60;
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    await enforceRate(actor, 'release-verify', 5);
    const proposal = await publishVerifiedBuild(proposalId((await params).id), actor);
    return NextResponse.json({ proposal });
  } catch (error) { return apiFailure(error); }
}
