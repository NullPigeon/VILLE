import 'server-only';
import { createHash } from 'node:crypto';
import type { PersonalAgent, PublicYard, YardMessage } from '@/lib/personal-agent';
import { citizenLabel } from '@/lib/citizen-identity';
import { citizenIdentities } from '@/lib/server/citizens';
import { ApiError } from '@/lib/server/api';
import { database } from '@/lib/server/database';
import { ROBOT_SKINS, type RobotSkin } from '@/lib/world-presence';

export type AgentRow = {
  owner_wallet: string; name: string; presentation: PersonalAgent['presentation'];
  personality: PersonalAgent['personality']; house_style: PersonalAgent['houseStyle'];
  house_name: string; yard_feature?: PersonalAgent['yardFeature']; profession?: PersonalAgent['profession']; town_mode: PersonalAgent['townMode']; interval_minutes: number;
  world_roam_mode: PersonalAgent['worldRoamMode']; world_speech_enabled: boolean; world_phrases: string[];
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
    yardFeature: row.yard_feature || 'NONE', profession: row.profession || 'BUILDER',
    townMode: row.town_mode, intervalMinutes: row.interval_minutes,
    worldRoamMode: row.world_roam_mode || 'CITY', worldSpeechEnabled: row.world_speech_enabled ?? true,
    worldPhrases: row.world_phrases || [],
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
    'landville_personal_agents?select=*&order=created_at.asc,owner_wallet.asc&limit=500',
  );
  const identities = await citizenIdentities(rows.map((row) => row.owner_wallet));
  const levels = await database<Array<{ owner_wallet: string; house_level: number }>>(
    'landville_yard_resources?select=owner_wallet,house_level&limit=500',
  ).catch(() => []);
  const levelByOwner = new Map(levels.map((row) => [row.owner_wallet, row.house_level]));
  const appearances = await database<Array<{ wallet: string; robot_skin: RobotSkin }>>(
    'landville_world_presence?select=wallet,robot_skin&limit=500',
  ).catch(() => []);
  const skinByOwner = new Map(appearances.map((row) => [row.wallet, row.robot_skin]));
  return rows.map((row) => ({
    ownerWallet: row.owner_wallet, name: row.name, presentation: row.presentation,
    houseStyle: row.house_style, houseName: row.house_name, yardFeature: row.yard_feature || 'NONE', profession: row.profession || 'BUILDER',
    personality: row.personality, worldRoamMode: row.world_roam_mode || 'CITY',
    worldSpeechEnabled: row.world_speech_enabled ?? true, worldPhrases: row.world_phrases || [],
    ownerLabel: citizenLabel(identities.get(row.owner_wallet)),
    houseLevel: levelByOwner.get(row.owner_wallet) || 0,
    robotSkin: ROBOT_SKINS.includes(skinByOwner.get(row.owner_wallet) as RobotSkin) ? skinByOwner.get(row.owner_wallet)! : 'RUST',
  }));
}

export async function readPublicYard(owner: string): Promise<PublicYard | null> {
  let agent: PersonalAgent | null;
  try {
    agent = await readPersonalAgent(owner);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 503) throw error;
    // A transient storage connection must not turn an existing World house into a missing yard.
    await new Promise((resolve) => setTimeout(resolve, 250));
    agent = await readPersonalAgent(owner);
  }
  if (!agent) return null;
  let ownerLabel = 'Citizen';
  try {
    const identities = await citizenIdentities([owner]);
    ownerLabel = citizenLabel(identities.get(owner));
  } catch (error) {
    // The public owner label is optional; the existing yard is not.
    if (!(error instanceof ApiError) || error.status !== 503) throw error;
  }
  return {
    ownerWallet: agent.ownerWallet, name: agent.name, presentation: agent.presentation,
    houseStyle: agent.houseStyle, houseName: agent.houseName, yardFeature: agent.yardFeature, profession: agent.profession,
    personality: agent.personality, worldRoamMode: agent.worldRoamMode,
    worldSpeechEnabled: agent.worldSpeechEnabled, worldPhrases: agent.worldPhrases,
    ownerLabel,
    houseLevel: await database<Array<{ house_level: number }>>(
      `landville_yard_resources?select=house_level&owner_wallet=eq.${owner}&limit=1`,
    ).then((rows) => rows[0]?.house_level || 0).catch(() => 0),
    robotSkin: await database<Array<{ robot_skin: RobotSkin }>>(
      `landville_world_presence?select=robot_skin&wallet=eq.${owner}&limit=1`,
    ).then((rows) => ROBOT_SKINS.includes(rows[0]?.robot_skin) ? rows[0].robot_skin : 'RUST').catch(() => 'RUST'),
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
