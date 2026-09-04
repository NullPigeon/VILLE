import 'server-only';
import { database } from '@/lib/server/database';
import type { CitizenIdentity } from '@/lib/citizen-identity';
export type CitizenRow = { wallet: string; joined_at: string; citizen_number?: number; username?: string | null; bio?: string; avatar?: string };
export function citizenIdentity(row: CitizenRow): CitizenIdentity {
  return { wallet: row.wallet, citizenNumber: row.citizen_number ?? null, username: row.username ?? null, bio: row.bio || '', avatar: row.avatar || 'fingerprint' };
}
export async function citizenIdentities(wallets: string[]) {
  const unique = [...new Set(wallets.filter((wallet) => /^0x[0-9a-f]{40}$/.test(wallet)))];
  const result = new Map<string, CitizenIdentity>();
  for (let index = 0; index < unique.length; index += 100) {
    const rows = await database<CitizenRow[]>(`landville_citizens?wallet=in.(${unique.slice(index,index+100).join(',')})&limit=100`);
    for (const row of rows) result.set(row.wallet, citizenIdentity(row));
  }
  return result;
}
