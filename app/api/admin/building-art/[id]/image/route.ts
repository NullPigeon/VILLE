import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { readBuildingArt } from '@/lib/server/building-art';
import { proposalId } from '@/lib/server/validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBuildAdmin(request);
    const art = await readBuildingArt(proposalId((await params).id), true);
    if (!art?.image_base64 || !['DRAFT', 'APPROVED'].includes(art.state)) throw new ApiError(404, 'Building design not found.');
    const bytes = Buffer.from(art.image_base64, 'base64');
    if (bytes.length < 100 || bytes.length > 3_800_000 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new ApiError(404, 'Building design not found.');
    return new NextResponse(Uint8Array.from(bytes), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return apiFailure(error); }
}
