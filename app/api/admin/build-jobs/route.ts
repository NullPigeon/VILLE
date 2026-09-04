import { NextRequest, NextResponse } from 'next/server';
import { apiFailure } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { database } from '@/lib/server/database';

export async function GET(request: NextRequest) {
  try {
    await requireBuildAdmin(request);
    const jobs = await database('landville_build_jobs?select=proposal_id,state,spec,attempt,branch,commit_sha,content_hash,pr_number,error,updated_at&order=updated_at.desc&limit=100');
    return NextResponse.json({ jobs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
