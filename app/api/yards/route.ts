import { NextResponse } from 'next/server';
import { apiFailure } from '@/lib/server/api';
import { readPublicYards } from '@/lib/server/personal-agents';

export async function GET() {
  try {
    return NextResponse.json({ yards: await readPublicYards() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
