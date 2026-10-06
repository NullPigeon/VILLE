import 'server-only';
import type { LinkedAgent, LinkedAgentCapability } from '@/lib/linked-agents';
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
