import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure } from '@/lib/server/api';
import { database } from '@/lib/server/database';
import { proposalId } from '@/lib/server/validation';

type PublishedArt = { image_base64: string; updated_at: string };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = proposalId((await params).id);
    const objects = await database<Array<{ proposal_id: string }>>(`landville_objects?select=proposal_id&proposal_id=eq.${id}&limit=1`);
    if (!objects[0]) throw new ApiError(404, 'Building not found.');
    const rows = await database<PublishedArt[]>(`landville_building_art?select=image_base64,updated_at&proposal_id=eq.${id}&state=eq.APPROVED&limit=1`);
    const art = rows[0];
    if (!art?.image_base64 || art.image_base64.length > 5_000_000 || !/^[A-Za-z0-9+/=]+$/.test(art.image_base64)) throw new ApiError(404, 'Building design not found.');
    const bytes = Buffer.from(art.image_base64, 'base64');
    if (bytes.length < 100 || bytes.length > 3_800_000 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new ApiError(404, 'Building design not found.');
    return new NextResponse(Uint8Array.from(bytes), { headers: {
      'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff', 'Last-Modified': new Date(art.updated_at).toUTCString(),
    } });
  } catch (error) { return apiFailure(error); }
}
