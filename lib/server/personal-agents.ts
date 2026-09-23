import 'server-only';
import { createHash } from 'node:crypto';
import type { PersonalAgent, PublicYard, YardMessage } from '@/lib/personal-agent';
import { citizenLabel } from '@/lib/citizen-identity';
import { citizenIdentities } from '@/lib/server/citizens';
import { database } from '@/lib/server/database';

export type AgentRow = {
  owner_wallet: string; name: string; presentation: PersonalAgent['presentation'];
  personality: PersonalAgent['personality']; house_style: PersonalAgent['houseStyle'];
  house_name: string; town_mode: PersonalAgent['townMode']; interval_minutes: number;
  next_town_at: string; created_at: string; lease_id?: string | null;
};
type YardMessageRow = {
  id: string; owner_wallet: string; request_id: string;
  role: YardMessage['role']; body: string; created_at: string;
};

export function agentRecord(row: AgentRow): PersonalAgent {
  return {
    ownerWallet: row.owner_wallet, name: row.name, presentation: row.presentation,
    personality: row.personality, houseStyle: row.house_style, houseName: row.house_name,
    townMode: row.town_mode, intervalMinutes: row.interval_minutes,
    nextTownAt: row.next_town_at, createdAt: row.created_at,
  };
}

export function yardMessage(row: YardMessageRow): YardMessage {
  return { id: row.id, role: row.role, body: row.body, createdAt: row.created_at };
}

export async function readPersonalAgent(owner: string) {
  const rows = await database<AgentRow[]>(`landville_personal_agents?owner_wallet=eq.${owner}&limit=1`);
  return rows[0] ? agentRecord(rows[0]) : null;
}

export async function readPublicYards(): Promise<PublicYard[]> {
  const rows = await database<AgentRow[]>(
    'landville_personal_agents?select=owner_wallet,name,presentation,house_style,house_name&order=created_at.asc,owner_wallet.asc&limit=500',
  );
  const identities = await citizenIdentities(rows.map((row) => row.owner_wallet));
  return rows.map((row) => ({
    ownerWallet: row.owner_wallet, name: row.name, presentation: row.presentation,
    houseStyle: row.house_style, houseName: row.house_name,
    ownerLabel: citizenLabel(identities.get(row.owner_wallet)),
  }));
}

export async function readPublicYard(owner: string): Promise<PublicYard | null> {
  const agent = await readPersonalAgent(owner);
  if (!agent) return null;
  const identities = await citizenIdentities([owner]);
  return {
    ownerWallet: agent.ownerWallet, name: agent.name, presentation: agent.presentation,
    houseStyle: agent.houseStyle, houseName: agent.houseName,
    ownerLabel: citizenLabel(identities.get(owner)),
  };
}

export async function readYardMessages(owner: string): Promise<YardMessage[]> {
  const rows = await database<YardMessageRow[]>(
    `landville_yard_messages?select=id,owner_wallet,request_id,role,body,created_at&owner_wallet=eq.${owner}&order=created_at.desc,turn_order.desc&limit=40`,
  );
  return rows.reverse().map(yardMessage);
}

export async function existingYardExchange(owner: string, requestId: string) {
  const rows = await database<YardMessageRow[]>(
    `landville_yard_messages?owner_wallet=eq.${owner}&request_id=eq.${requestId}&order=created_at.asc,turn_order.asc&limit=2`,
  );
  return rows.map(yardMessage);
}

export function agentSafetyId(owner: string) {
  return createHash('sha256').update(`landville:agent:${owner}`).digest('hex');
}
