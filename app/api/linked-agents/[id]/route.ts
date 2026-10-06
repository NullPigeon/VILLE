import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, requireWallet } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const origin = request.headers.get('origin');
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== request.nextUrl.origin)) throw new ApiError(403, 'Cross-site writes are not allowed.');
    const owner = requireWallet(request);
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(400, 'Invalid agent ID.');
    await enforceRate(owner, 'linked-agent-remove', 10);
    const rows = await database<Array<{ id: string }>>(
      `landville_linked_agents?id=eq.${encodeURIComponent(id)}&owner_wallet=eq.${encodeURIComponent(owner)}&select=id`,
      { method: 'DELETE', headers: { Prefer: 'return=representation' } },
    );
    if (!rows.length) throw new ApiError(404, 'Agent not found on your profile.');
    return NextResponse.json({ removed: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
