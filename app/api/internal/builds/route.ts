import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody } from '@/lib/server/api';
import { rpc } from '@/lib/server/database';
import { requireWorker, workerActor } from '@/lib/server/builds';
import { oneOf, proposalId, requestId } from '@/lib/server/validation';

export async function POST(request: NextRequest) {
  try {
    requireWorker(request);
    const body = await jsonBody(request);
    const action = oneOf(body.action, ['TICK', 'CLAIM', 'COMPLETE', 'FAIL']);
    if (action === 'TICK' || action === 'CLAIM') {
      if (action === 'CLAIM' && process.env.LANDVILLE_BUILDER_ENABLED !== 'true') throw new ApiError(503, 'Automatic builder is disabled.');
      const work = await rpc('landville_claim_build', { p_actor: workerActor(), p_claim: action === 'CLAIM' });
      return NextResponse.json({ work }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const id = proposalId(typeof body.id === 'string' ? body.id : '');
    const lease = requestId(body.lease);
    if (action === 'COMPLETE' && (typeof body.sha !== 'string' || !/^[0-9a-f]{40}$/.test(body.sha) || typeof body.hash !== 'string' || !/^[0-9a-f]{64}$/.test(body.hash) || !Number.isSafeInteger(body.pr) || Number(body.pr) < 1)) throw new ApiError(400, 'Invalid build receipt.');
    const job = await rpc('landville_finish_build', {
      p_id: id, p_lease: lease, p_sha: action === 'COMPLETE' ? body.sha : null,
      p_hash: action === 'COMPLETE' ? body.hash : null, p_pr: action === 'COMPLETE' ? body.pr : null,
      // Never persist raw model output, command logs or provider error bodies.
      p_error: action === 'FAIL' ? 'Builder failed. Inspect the private workflow run before retrying.' : null,
    });
    return NextResponse.json({ job }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
