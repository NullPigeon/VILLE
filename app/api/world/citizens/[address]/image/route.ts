import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { ApiError, apiFailure } from '@/lib/server/api';
import { database } from '@/lib/server/database';

type WorldCitizenImage = { image_base64: string; mime_type: string; updated_at: string };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const address = (await params).address.toLowerCase();
    if (!isAddress(address, { strict: true })) throw new ApiError(404, 'World citizen not found.');
    const rows = await database<WorldCitizenImage[]>(`landville_world_citizens?select=image_base64,mime_type,updated_at&citizen_wallet=eq.${address}&limit=1`);
    const row = rows[0];
    if (!row || row.mime_type !== 'image/webp' || !/^[A-Za-z0-9+/=]+$/.test(row.image_base64)) throw new ApiError(404, 'World citizen not found.');
    const bytes = Buffer.from(row.image_base64, 'base64');
    if (bytes.length < 50 || bytes.length > 3_800_000) throw new ApiError(404, 'World citizen not found.');
    return new NextResponse(Uint8Array.from(bytes), { headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff',
      'Last-Modified': new Date(row.updated_at).toUTCString(),
    } });
  } catch (error) { return apiFailure(error); }
}
