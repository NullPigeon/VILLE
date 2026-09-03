import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, requireWallet } from '@/lib/server/api';
import { readVotingSnapshot } from '@/lib/server/voting';

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await readVotingSnapshot(requireWallet(request))); }
  catch (error) { return apiFailure(error); }
}
