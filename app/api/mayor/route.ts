import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen } from '@/lib/server/database';
import { readMessages, sendMessage } from '@/lib/server/chat';
import { field, requestId } from '@/lib/server/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    return NextResponse.json(await readMessages('WORKSHOP', wallet, request.nextUrl.searchParams.get('before') || undefined));
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    const body = await jsonBody(request);
    return NextResponse.json(await sendMessage(wallet, 'WORKSHOP', field(body, 'body', 1, 600), requestId(body.requestId)));
  } catch (error) { return apiFailure(error); }
}
