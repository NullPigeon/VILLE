import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, ApiError, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, assertCitizen, enforceRate } from '@/lib/server/database';
import { citizenIdentity, type CitizenRow } from '@/lib/server/citizens';
import { CITIZEN_AVATARS, validUsername } from '@/lib/citizen-identity';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: NextRequest) {
  try {
    const wallet = requireWallet(request);
    const rows = await database<CitizenRow[]>(`landville_citizens?wallet=eq.${wallet}&limit=1`);
    if (!rows[0]) throw new ApiError(404, 'Citizen account not found.');
    return NextResponse.json({ profile: citizenIdentity(rows[0]) }, { headers });
  } catch (error) { return apiFailure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['username','bio','avatar'].includes(key))) throw new ApiError(400, 'Only username, bio and avatar can be edited.');
    if (typeof body.username !== 'string' || typeof body.bio !== 'string' || typeof body.avatar !== 'string') throw new ApiError(400, 'Username, bio and avatar are required.');
    const username = body.username.trim().toLowerCase();
    if (username && !validUsername(username)) throw new ApiError(400, 'Use 3–24 letters, numbers or underscores, starting with a letter. Official and numbered citizen names are reserved.');
    const bio = body.bio.trim();
    if (bio.length > 280) throw new ApiError(400, 'Bio must be 280 characters or fewer.');
    if (!(CITIZEN_AVATARS as readonly string[]).includes(body.avatar)) throw new ApiError(400, 'Choose an available avatar.');
    await assertCitizen(wallet);
    await enforceRate(wallet, 'profile', 5);
    let rows: CitizenRow[];
    try {
      rows = await database<CitizenRow[]>(`landville_citizens?wallet=eq.${wallet}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ username: username || null, bio, avatar: body.avatar }) });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) throw new ApiError(409, 'That username is already taken. Choose another.');
      throw error;
    }
    if (!rows[0]) throw new ApiError(404, 'Citizen account not found.');
    return NextResponse.json({ profile: citizenIdentity(rows[0]) }, { headers });
  } catch (error) { return apiFailure(error); }
}
