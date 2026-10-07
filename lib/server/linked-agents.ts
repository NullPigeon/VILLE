import 'server-only';
import { createHash } from 'node:crypto';
import type { LinkedAgent, LinkedAgentCapability } from '@/lib/linked-agents';
import { ApiError } from '@/lib/server/api';
import { database } from '@/lib/server/database';

export type LinkedAgentRow = {
  id: string;
  owner_wallet: string;
  name: string;
  description: string;
  capabilities: LinkedAgentCapability[];
  last_seen_at: string | null;
  created_at: string;
};

export function linkedAgentRecord(row: LinkedAgentRow): LinkedAgent {
  return { id: row.id, name: row.name, description: row.description, capabilities: row.capabilities || [], connectedAt: row.last_seen_at, createdAt: row.created_at };
}

export async function readLinkedAgents(owner: string) {
  const rows = await database<LinkedAgentRow[]>(
    `landville_linked_agents?select=id,owner_wallet,name,description,capabilities,last_seen_at,created_at&owner_wallet=eq.${encodeURIComponent(owner)}&order=created_at.desc&limit=5`,
  );
  return rows.map(linkedAgentRecord);
}

export async function linkedAgentOwner(token: string) {
  return (await linkedAgentCredential(token)).ownerWallet;
}

export async function linkedAgentCredential(token: string) {
  if (!/^lvag_[0-9a-f]{64}$/.test(token)) throw new ApiError(401, 'Connect your agent with its profile key.');
  const hash = createHash('sha256').update(token).digest('hex');
  const rows = await database<Array<{ id: string; owner_wallet: string }>>(
    `landville_linked_agents?select=id,owner_wallet&token_hash=eq.${hash}&limit=1`,
  );
  if (!rows.length) throw new ApiError(401, 'This agent connection was revoked.');
  return { id: rows[0].id, ownerWallet: rows[0].owner_wallet };
}
