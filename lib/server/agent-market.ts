import 'server-only';
import { AGENT_SKILLS, DEFAULT_AGENT_SKILLS, availableAgentSkills, hasMarketHolderBalance, isAgentSkillId, type AgentSkillId } from '@/lib/agent-market';
import { ApiError } from '@/lib/server/api';
import { database } from '@/lib/server/database';
import { readVotingSnapshot } from '@/lib/server/voting';

type MarketLoadoutRow = { market_skills: string[] };

export async function readAgentMarketSkills(owner: string): Promise<AgentSkillId[]> {
  const rows = await database<MarketLoadoutRow[]>(
    `landville_personal_agents?select=market_skills&owner_wallet=eq.${encodeURIComponent(owner)}&limit=1`,
  );
  if (!rows.length) throw new ApiError(404, 'Build your robot first.');
  const skills = rows[0].market_skills;
  return Array.isArray(skills) ? skills.filter(isAgentSkillId).slice(0, 3) : DEFAULT_AGENT_SKILLS;
}

export async function hasMarketHolderAccess(owner: string) {
  const snapshot = await readVotingSnapshot(owner);
  return snapshot.source === 'chain' && hasMarketHolderBalance(snapshot.tokenBalance);
}

export async function readEquippedSkills(owner: string) {
  let selected = DEFAULT_AGENT_SKILLS;
  try { selected = await readAgentMarketSkills(owner); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 503) throw error;
    // The yard remains usable while the market migration is being deployed.
  }
  let holder = false;
  try { holder = await hasMarketHolderAccess(owner); }
  catch { /* A failed chain read cannot grant holder access. Basic skills remain available. */ }
  return availableAgentSkills(holder, selected);
}

export function skillInstructions(ids: readonly AgentSkillId[]) {
  const instructions = AGENT_SKILLS.filter((skill) => ids.includes(skill.id)).map((skill) => `- ${skill.name}: ${skill.instruction}`);
  return instructions.length
    ? `Equipped conversational skills. These are ways to help in chat, not external tools or live data sources.\n${instructions.join('\n')}`
    : 'No special skills are equipped. Respond conversationally.';
}
