import { NextRequest, NextResponse } from 'next/server';
import { validateSpec } from '@/lib/build-contract';
import { ApiError, apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { githubRead, readJob, requireBuildAdmin } from '@/lib/server/builds';
import { database, enforceRate, rpc } from '@/lib/server/database';
import { oneOf, proposalId } from '@/lib/server/validation';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    const id = proposalId((await params).id);
    const body = await jsonBody(request);
    const action = oneOf(body.action, ['PREPARE', 'RETRY']);
    await enforceRate(actor, 'build-spec', 10);
    let spec = null;
    if (action === 'RETRY') {
      const previous = await readJob(id);
      if (previous.state === 'REVIEW') {
        if (!previous.pr_number) throw new ApiError(409, 'No previous PR to reconcile.');
        const pr = await githubRead<{ state: string; merged: boolean }>(`pulls/${previous.pr_number}`);
        if (pr.state !== 'closed' || pr.merged) throw new ApiError(409, 'Close the unmerged previous PR before rebuilding.');
      }
    }
    if (action === 'PREPARE') {
      const proposals = await database<Array<{ summary: string }>>(`landville_proposals?select=summary&id=eq.${id}&limit=1`);
      if (!proposals[0]) throw new ApiError(404, 'Proposal not found.');
      try { spec = validateSpec({ version: 1, runtime: 'sandbox-html', goal: proposals[0].summary, acceptance: body.acceptance, constraints: body.constraints || '' }); }
      catch { throw new ApiError(400, 'Add 1–10 acceptance checks (5–300 characters each), and constraints up to 2000 characters.'); }
    }
    const job = await rpc('landville_prepare_build', { p_id: id, p_actor: actor, p_spec: spec, p_retry: action === 'RETRY' });
    return NextResponse.json({ job });
  } catch (error) { return apiFailure(error); }
}
