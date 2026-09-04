import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen } from '@/lib/server/database';
import { readMessages } from '@/lib/server/chat';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    return NextResponse.json(await readMessages('WORKSHOP', wallet, request.nextUrl.searchParams.get('before') || undefined), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    requireWallet(request);
    return NextResponse.json({ error: 'Workshop is now a read-only private archive. Open Town Chat to write publicly. Nothing was posted.' }, { status: 410 });
  } catch (error) { return apiFailure(error); }
}
