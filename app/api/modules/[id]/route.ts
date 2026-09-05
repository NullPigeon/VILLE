import { NextRequest, NextResponse } from 'next/server';
import { MODULE_CSP } from '@/lib/build-contract';
import { ApiError, apiFailure, requireWallet } from '@/lib/server/api';
import { assertCitizen, database } from '@/lib/server/database';
import { readCityModule } from '@/lib/server/city-module';
import { proposalId } from '@/lib/server/validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    const id = proposalId((await params).id);
    const objects = await database<Array<{ artifact_path: string; artifact_hash: string }>>(`landville_objects?select=artifact_path,artifact_hash&proposal_id=eq.${id}&limit=1`);
    if (!objects[0]) throw new ApiError(404, 'This module is awaiting publication.');
    const artifact = await readCityModule(id, objects[0].artifact_path);
    if (objects[0].artifact_hash !== artifact.hash) throw new ApiError(409, 'This module version has not been verified for publication.');
    return new NextResponse(artifact.module.html, { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': MODULE_CSP,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    } });
  } catch (error) { return apiFailure(error); }
}
