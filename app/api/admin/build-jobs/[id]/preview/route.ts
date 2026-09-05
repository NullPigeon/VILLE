import { NextRequest, NextResponse } from 'next/server';
import { artifactPathFor, MODULE_CSP } from '@/lib/build-contract';
import { ApiError, apiFailure } from '@/lib/server/api';
import { readJob, requireBuildAdmin } from '@/lib/server/builds';
import { readCityModule } from '@/lib/server/city-module';
import { proposalId } from '@/lib/server/validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBuildAdmin(request);
    const id = proposalId((await params).id);
    const job = await readJob(id);
    if (job.state !== 'REVIEW' || !job.content_hash) throw new ApiError(409, 'A completed builder revision is required.');
    const artifact = await readCityModule(id, artifactPathFor(id, job.revision));
    if (artifact.hash !== job.content_hash) throw new ApiError(409, 'The deployed revision does not match the reviewed artifact.');
    return new NextResponse(artifact.module.html, { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': MODULE_CSP,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    } });
  } catch (error) { return apiFailure(error); }
}
