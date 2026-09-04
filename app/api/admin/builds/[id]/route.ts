import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, isAdmin, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, enforceRate, rpc } from '@/lib/server/database';
import { proposalRecord, type ProposalRow } from '@/lib/server/records';
import { field, oneOf, proposalId } from '@/lib/server/validation';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const actor = requireWallet(request);
    if (!isAdmin(actor)) throw new ApiError(403, 'This wallet does not have build administrator access.');
    await assertCitizen(actor);
    const id = proposalId((await params).id);
    const body = await jsonBody(request);
    const action = oneOf(body.action, ['FINALIZE','START_BUILD','PUBLISH','REJECT']);
    const expected = oneOf(body.expectedStatus, ['LIVE','PASSED','BUILDING','BUILT','REJECTED']);
    const note = field(body, 'note', 3, 1000);
    const modulePath = action === 'PUBLISH' ? field(body, 'modulePath', 2, 200) : null;
    const releaseRef = action === 'PUBLISH' ? field(body, 'releaseRef', 8, 200) : null;
    if (modulePath && (!/^\/[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(modulePath) || /^\/(api|admin)(\/|$)/.test(modulePath))) throw new ApiError(400, 'Use the public path of a deployed module on this site.');
    if (action === 'START_BUILD' || action === 'PUBLISH') throw new ApiError(409, 'Use the reviewed builder job and verified production release flow. Manual status changes cannot publish a feature.');
    await enforceRate(actor, 'build', 20);
    const row = await rpc<ProposalRow>('landville_transition', { p_id: id, p_actor: actor, p_expected: expected, p_action: action, p_note: note, p_module_path: modulePath, p_release_ref: releaseRef });
    return NextResponse.json({ proposal: proposalRecord(row) });
  } catch (error) { return apiFailure(error); }
}
