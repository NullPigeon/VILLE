import { NextResponse } from 'next/server';
import { apiFailure } from '@/lib/server/api';
import { readScrapyTokenStatus } from '@/lib/server/token-status';

export const revalidate = 30;

export async function GET() {
  try {
    const response = NextResponse.json(await readScrapyTokenStatus());
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
