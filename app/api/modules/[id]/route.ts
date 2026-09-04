import { NextRequest, NextResponse } from 'next/server';
import { MODULE_CSP } from '@/lib/build-contract';
import { ApiError, apiFailure, isAdmin, requireWallet } from '@/lib/server/api';
import { assertCitizen, database } from '@/lib/server/database';
import { readCityModule } from '@/lib/server/city-module';
import { proposalId } from '@/lib/server/validation';
import { readJob } from '@/lib/server/builds';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    const id = proposalId((await params).id);
    const artifact = await readCityModule(id);
    if (!isAdmin(wallet)) {
      const objects = await database<Array<{ proposal_id: string }>>(`landville_objects?select=proposal_id&proposal_id=eq.${id}&limit=1`);
      if (!objects.length) throw new ApiError(404, 'This module is awaiting publication.');
      const job = await readJob(id);
      if (job.state !== 'RELEASED' || job.content_hash !== artifact.hash) throw new ApiError(409, 'This module version has not been verified for publication.');
    }
    return new NextResponse(artifact.module.html, { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': MODULE_CSP,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    } });
  } catch (error) { return apiFailure(error); }
}
