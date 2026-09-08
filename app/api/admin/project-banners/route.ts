import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { database, enforceRate } from '@/lib/server/database';
import { projectBanner, type ProjectBannerRow } from '@/lib/project-banner';
import { projectBannerInput } from '@/lib/server/project-banners';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    await requireBuildAdmin(request);
    const rows = await database<ProjectBannerRow[]>('landville_project_banners?select=*&order=display_order.asc,created_at.asc&limit=100');
    return NextResponse.json({ banners: rows.map(projectBanner) }, { headers });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    await enforceRate(actor, 'project-banner-admin', 30);
    const input = projectBannerInput(await jsonBody(request));
    const rows = await database<ProjectBannerRow[]>('landville_project_banners', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(input) });
    return NextResponse.json({ banner: projectBanner(rows[0]) }, { headers });
  } catch (error) { return apiFailure(error); }
}
