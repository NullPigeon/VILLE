import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, ApiError, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { readMessages, sendMessage } from '@/lib/server/chat';
import { field, oneOf, requestId } from '@/lib/server/validation';
import { mayorConfiguration } from '@/lib/server/mayor-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const room = oneOf(request.nextUrl.searchParams.get('room') || 'TOWN', ['TOWN','BUILD']);
    return NextResponse.json({ ...await readMessages('TOWN', '', request.nextUrl.searchParams.get('before') || undefined, room), room, mode: 'shared', aiConfigured: mayorConfiguration().configured }, { headers: { 'Cache-Control': 'no-store' } });
  }
  catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    const body = await jsonBody(request);
    if (body.askScrapy !== undefined && typeof body.askScrapy !== 'boolean') throw new ApiError(400, 'Choose SEND or ASK SCRAPY.');
    const room = oneOf(body.room ?? (body.askScrapy === true ? 'BUILD' : 'TOWN'), ['TOWN','BUILD']);
    if (body.askScrapy !== undefined && body.askScrapy !== (room === 'BUILD')) throw new ApiError(400, 'Use Build with Scrapy for ideas or Town Square to talk to citizens.');
    return NextResponse.json(await sendMessage(wallet, 'TOWN', field(body, 'body', 1, 600), requestId(body.requestId), room === 'BUILD'));
  } catch (error) { return apiFailure(error); }
}
