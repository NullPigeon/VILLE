import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, ApiError, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { readMessages, sendMessage } from '@/lib/server/chat';
import { field, requestId } from '@/lib/server/validation';
import { mayorConfiguration } from '@/lib/server/mayor-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try { return NextResponse.json({ ...await readMessages('TOWN', '', request.nextUrl.searchParams.get('before') || undefined), mode: 'shared', aiConfigured: mayorConfiguration().configured }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    const body = await jsonBody(request);
    if (body.askScrapy !== undefined && typeof body.askScrapy !== 'boolean') throw new ApiError(400, 'Choose SEND or ASK SCRAPY.');
    return NextResponse.json(await sendMessage(wallet, 'TOWN', field(body, 'body', 1, 600), requestId(body.requestId), body.askScrapy === true));
  } catch (error) { return apiFailure(error); }
}
