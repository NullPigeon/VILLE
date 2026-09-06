import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { enforceRate } from '@/lib/server/database';
import { normalizeEmail, sendEmailOtp } from '@/lib/server/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const email = normalizeEmail((await jsonBody(request)).email);
    const key = createHash('sha256').update(email).digest('hex');
    await enforceRate(key, 'email-otp', 3);
    await sendEmailOtp(email);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
