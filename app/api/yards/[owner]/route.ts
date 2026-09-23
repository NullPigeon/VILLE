import { NextResponse } from 'next/server';
import { ApiError, apiFailure } from '@/lib/server/api';
import { readPublicYard } from '@/lib/server/personal-agents';

export async function GET(_request: Request, context: { params: Promise<{ owner: string }> }) {
  try {
    const { owner } = await context.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) throw new ApiError(400, 'Invalid citizen address.');
    const yard = await readPublicYard(owner.toLowerCase());
    if (!yard) throw new ApiError(404, 'This citizen has not built a yard yet.');
    return NextResponse.json({ yard }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
