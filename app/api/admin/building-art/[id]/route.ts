import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { enforceRate, rpc } from '@/lib/server/database';
import { generateBuildingArt, readBuildingArt } from '@/lib/server/building-art';
import { proposalId } from '@/lib/server/validation';

export const maxDuration = 180;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBuildAdmin(request);
    const id = proposalId((await params).id);
    const art = await readBuildingArt(id);
    return NextResponse.json({ art }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    const id = proposalId((await params).id);
    const body = await jsonBody(request);
    if (body.action === 'GENERATE' && Object.keys(body).every((key) => ['action', 'regenerate'].includes(key)) && (body.regenerate === undefined || typeof body.regenerate === 'boolean')) {
      await enforceRate(actor, 'building-art', 3);
      const art = await generateBuildingArt(id, body.regenerate === true);
      return NextResponse.json({ art }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (body.action === 'APPROVE' && Object.keys(body).length === 1) {
      await rpc('landville_approve_building_art', { p_id: id, p_actor: actor });
      return NextResponse.json({ art: await readBuildingArt(id) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    throw new ApiError(400, 'Choose a valid building design action.');
  } catch (error) { return apiFailure(error); }
}
