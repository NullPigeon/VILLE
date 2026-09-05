import { NextResponse } from 'next/server';
import { ApiError, apiFailure } from '@/lib/server/api';
import { readJob } from '@/lib/server/builds';
import { readCityModule } from '@/lib/server/city-module';
import { database } from '@/lib/server/database';
import { proposalId } from '@/lib/server/validation';

const PREVIEW_CSP = "sandbox; default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = proposalId((await params).id);
    const artifact = await readCityModule(id);
    const [objects, job] = await Promise.all([
      database<Array<{ proposal_id: string }>>(`landville_objects?select=proposal_id&proposal_id=eq.${id}&limit=1`),
      readJob(id),
    ]);
    if (!objects.length || job.state !== 'RELEASED' || job.content_hash !== artifact.hash) throw new ApiError(404, 'Published preview not found.');
    const staticHtml = artifact.module.html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
    return new NextResponse(staticHtml, { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': PREVIEW_CSP,
      'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    } });
  } catch (error) { return apiFailure(error); }
}
