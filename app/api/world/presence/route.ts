import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, ApiError, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate } from '@/lib/server/database';
import { allRows } from '@/lib/server/records';
import { HERO_SKINS, ROBOT_SKINS, type WorldPresence, type WorldResident } from '@/lib/world-presence';

type ResidentRow = { wallet: string; citizen_number: number; username: string | null; avatar: string };
type PresenceRow = { wallet: string; x: number; y: number; hero_skin: WorldPresence['heroSkin']; robot_skin: WorldPresence['robotSkin']; updated_at: string };

function publicPresence(row: PresenceRow): WorldPresence {
  return { wallet: row.wallet, x: row.x, y: row.y, heroSkin: row.hero_skin, robotSkin: row.robot_skin, updatedAt: row.updated_at };
}

export async function GET() {
  try {
    const [residents, positions] = await Promise.all([
      allRows<ResidentRow>('landville_citizens?select=wallet,citizen_number,username,avatar&order=citizen_number.asc'),
      allRows<PresenceRow>('landville_world_presence?select=wallet,x,y,hero_skin,robot_skin,updated_at&order=wallet.asc'),
    ]);
    return NextResponse.json({
      residents: residents.map((row): WorldResident => ({ wallet: row.wallet, citizenNumber: row.citizen_number, username: row.username, avatar: row.avatar })),
      positions: positions.map(publicPresence),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    const body = await jsonBody(request);
    const { x, y, heroSkin, robotSkin } = body;
    if (!Number.isInteger(x) || !Number.isInteger(y) || typeof x !== 'number' || typeof y !== 'number' ||
      x < 0 || x > 10000 || y < 0 || y > 10000 ||
      (heroSkin !== 'MODULE' && !HERO_SKINS.some((skin) => skin === heroSkin)) ||
      !ROBOT_SKINS.some((skin) => skin === robotSkin)) {
      throw new ApiError(400, 'Invalid world position or appearance.');
    }
    await assertCitizen(wallet);
    await enforceRate(wallet, 'world-presence', 80);
    const rows = await database<PresenceRow[]>('landville_world_presence?on_conflict=wallet', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ wallet, x, y, hero_skin: heroSkin, robot_skin: robotSkin, updated_at: new Date().toISOString() }),
    });
    return NextResponse.json({ position: publicPresence(rows[0]) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
