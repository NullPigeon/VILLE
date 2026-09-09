import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody } from '@/lib/server/api';
import { rpc } from '@/lib/server/database';
import { requireWorker, workerActor } from '@/lib/server/builds';
import { oneOf, proposalId, requestId } from '@/lib/server/validation';

const failurePhases: Record<string, string> = {
  REPOSITORY: 'repository preparation', CONTEXT: 'site-context loading', ARCHITECTURE: 'architecture planning', ARCHITECTURE_REPAIR: 'architecture repair',
  DRAFT: 'module generation', REVIEW: 'creative review', REPAIR: 'creative repair', ARTIFACT: 'artifact validation',
  GITHUB: 'GitHub publication', RECEIPT: 'build receipt confirmation',
};
const failureKinds: Record<string, string> = {
  TIMEOUT: 'timed out', RATE_LIMIT: 'was rate-limited', PROVIDER: 'hit a provider error',
  AI_OUTPUT: 'returned invalid AI output', QUALITY_GATE: 'did not pass the quality gate',
  CONTRACT: 'failed the module contract', RECEIPT: 'could not confirm its receipt', UNKNOWN: 'failed unexpectedly',
};

function reportedBuildError(body: Record<string, unknown>) {
  const phase = typeof body.phase === 'string' ? failurePhases[body.phase] : null;
  const failure = typeof body.failure === 'string' ? failureKinds[body.failure] : null;
  return phase && failure ? `Builder ${failure} during ${phase}. Operator review required.` : 'Builder failed. Inspect the private workflow run before retrying.';
}

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
      p_error: action === 'FAIL' ? reportedBuildError(body) : null,
    });
    return NextResponse.json({ job }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
