import 'server-only';
import { createHash } from 'node:crypto';
import { isAddress } from 'viem';
import { ApiError } from '@/lib/server/api';
import { citizenAccount, database } from '@/lib/server/database';

type MarketOrder = {
  authorization_hash: string;
  service_id: string;
  prompt_hash: string;
  status: 'processing' | 'settled' | 'failed' | 'settlement_unknown';
  output: string | null;
  transaction_hash: string | null;
  payer: string | null;
};

export function marketHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function marketOrderStorageReady() {
  try {
    await database('landville_market_orders?select=authorization_hash&limit=0');
    return true;
  } catch { return false; }
}

export async function marketOrder(hash: string) {
  const rows = await database<MarketOrder[]>(`landville_market_orders?select=authorization_hash,service_id,prompt_hash,status,output,transaction_hash,payer&authorization_hash=eq.${hash}&limit=1`);
  return rows[0] || null;
}

export async function citizenMarketResult(owner: string, transaction: string) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(transaction)) throw new ApiError(400, 'Choose a completed Market job.');
  const citizen = await citizenAccount(owner);
  const payer = citizen?.linked_wallet;
  if (!payer || !isAddress(payer)) throw new ApiError(404, 'Market result not found for this wallet.');
  const rows = await database<Array<{ service_id: string; output: string | null }>>(
    `landville_market_orders?select=service_id,output&status=eq.settled&transaction_hash=ilike.${transaction}&payer=ilike.${payer}&limit=1`,
  );
  const order = rows[0];
  if (!order?.output) throw new ApiError(404, 'Market result not found for this wallet.');
  return { serviceId: order.service_id, output: order.output.slice(0, 12000) };
}

export async function claimMarketOrder(hash: string, service: string, promptHash: string) {
  const inserted = await database<MarketOrder[]>('landville_market_orders?on_conflict=authorization_hash', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ authorization_hash: hash, service_id: service, prompt_hash: promptHash, status: 'processing' }),
  });
  if (inserted.length) return true;
  const existing = await marketOrder(hash);
  if (!existing || existing.service_id !== service || existing.prompt_hash !== promptHash) throw new ApiError(409, 'This payment authorization belongs to another request.');
  return false;
}

export async function finishMarketOrder(hash: string, status: MarketOrder['status'], result?: { output: string; transaction: string; payer: string }) {
  await database(`landville_market_orders?authorization_hash=eq.${hash}&status=eq.processing`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status, output: result?.output || null, transaction_hash: result?.transaction || null,
      payer: result?.payer?.toLowerCase() || null, updated_at: new Date().toISOString() }),
  });
}
