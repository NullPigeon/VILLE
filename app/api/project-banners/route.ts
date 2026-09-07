import { NextResponse } from 'next/server';
import { apiFailure } from '@/lib/server/api';
import { database } from '@/lib/server/database';
import { projectBanner, type ProjectBannerRow } from '@/lib/project-banner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await database<ProjectBannerRow[]>('landville_project_banners?select=*&active=eq.true&order=display_order.asc,created_at.asc&limit=100');
    return NextResponse.json({ banners: rows.map(projectBanner) }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
  } catch (error) { return apiFailure(error); }
}
