import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { database, enforceRate } from '@/lib/server/database';
import { projectBanner, type ProjectBannerRow } from '@/lib/project-banner';
import { bannerId, projectBannerInput } from '@/lib/server/project-banners';

const headers = { 'Cache-Control': 'private, no-store' };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    await enforceRate(actor, 'project-banner-admin', 30);
    const id = bannerId((await params).id);
    const input = projectBannerInput(await jsonBody(request));
    const rows = await database<ProjectBannerRow[]>(`landville_project_banners?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...input, updated_at: new Date().toISOString() }) });
    if (!rows[0]) throw new ApiError(404, 'Project banner not found.');
    return NextResponse.json({ banner: projectBanner(rows[0]) }, { headers });
  } catch (error) { return apiFailure(error); }
}
