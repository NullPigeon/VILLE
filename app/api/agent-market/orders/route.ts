import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { apiFailure, requireWallet } from '@/lib/server/api';
import { citizenAccount, database } from '@/lib/server/database';

export const runtime = 'nodejs';

type OrderRow = { service_id: string; output: string | null; transaction_hash: string | null; created_at: string };

export async function GET(request: NextRequest) {
  try {
    const owner = requireWallet(request);
    const citizen = await citizenAccount(owner);
    const wallet = citizen?.linked_wallet;
    if (!wallet || !isAddress(wallet)) return NextResponse.json({ orders: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    const rows = await database<OrderRow[]>(
      `landville_market_orders?select=service_id,output,transaction_hash,created_at&status=eq.settled&payer=ilike.${wallet}&order=created_at.desc&limit=20`,
    );
    return NextResponse.json({ orders: rows.map((row) => ({ serviceId: row.service_id, output: row.output,
      transaction: row.transaction_hash, createdAt: row.created_at })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
