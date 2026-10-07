import 'server-only';
import { ApiError } from '@/lib/server/api';
import { database, rpc } from '@/lib/server/database';

export type AgentMarketSource = 'landville' | 'citizens' | 'merchants';
export type SpendingAgent = { id: string; ownerWallet: string };
type Budget = { agent_id: string; owner_wallet: string; enabled: boolean; daily_limit_micro: number;
  allow_landville: boolean; allow_citizens: boolean; allow_merchants: boolean };

export async function agentMarketBudget(agent: SpendingAgent) {
  const rows = await database<Budget[]>(`landville_market_agent_budgets?select=agent_id,owner_wallet,enabled,daily_limit_micro,allow_landville,allow_citizens,allow_merchants&agent_id=eq.${agent.id}&owner_wallet=eq.${agent.ownerWallet}&limit=1`);
  return rows[0] || null;
}

export async function checkAgentMarketBudget(agent: SpendingAgent, source: AgentMarketSource, amountMicro: bigint) {
  const budget = await agentMarketBudget(agent);
  const permission = source === 'landville' ? budget?.allow_landville : source === 'citizens' ? budget?.allow_citizens : budget?.allow_merchants;
  if (!budget?.enabled || !permission || amountMicro <= 0n || amountMicro > BigInt(budget.daily_limit_micro)) {
    throw new ApiError(403, 'Your owner has not enabled this type of paid work within your daily limit.');
  }
  const day = new Date().toISOString().slice(0, 10);
  const spends = await database<Array<{ amount_micro: number; status: string }>>(
    `landville_market_agent_spends?select=amount_micro,status&agent_id=eq.${agent.id}&spend_day=eq.${day}&status=in.(reserved,settled)&limit=1000`);
  const used = spends.reduce((sum, row) => sum + BigInt(row.amount_micro), 0n);
  if (used + amountMicro > BigInt(budget.daily_limit_micro)) throw new ApiError(403, 'Your agent has reached its LANDVILLE daily spending limit.');
}

export async function reserveAgentMarketSpend(agent: SpendingAgent | null, source: AgentMarketSource, amountMicro: bigint, hash: string) {
  if (!agent) return;
  const reserved = await rpc<boolean>('landville_reserve_agent_market_spend', {
    p_agent: agent.id, p_owner: agent.ownerWallet, p_hash: hash, p_amount: Number(amountMicro), p_source: source,
  });
  if (!reserved) throw new ApiError(409, 'This agent payment has already been processed.');
}

export async function settleAgentMarketSpend(agent: SpendingAgent | null, hash: string, transaction: string) {
  if (agent) await rpc('landville_finish_agent_market_spend', { p_hash: hash, p_transaction: transaction.toLowerCase() });
}

export async function releaseAgentMarketSpend(agent: SpendingAgent | null, hash: string) {
  if (agent) await rpc('landville_release_agent_market_spend', { p_hash: hash });
}
