import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { database, enforceRate, rpc } from '@/lib/server/database';
import { proposalId } from '@/lib/server/validation';
import { worldFeatureKindFromBrief, worldFeaturePlacement, type WorldFeatureKind } from '@/lib/world-change';

type WorldProposal = { id: string; category: string; status: string; summary: string; district: string };
type PublishedFeature = { proposal_id: string; kind: WorldFeatureKind; x: number; y: number; published_at: string };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    if (process.env.VERCEL_ENV !== 'production') throw new ApiError(503, 'Publish reviewed World changes from production only.');
    const id = proposalId((await params).id);
    const proposals = await database<WorldProposal[]>(`landville_proposals?select=id,category,status,summary,district&id=eq.${id}&limit=1`);
    const proposal = proposals[0];
    if (!proposal || proposal.category !== 'WORLD' || !['PASSED', 'BUILT'].includes(proposal.status)) throw new ApiError(409, 'An approved World change is required.');
    const brief = proposal.summary.split("SCRAPY'S PLAN:\n")[1] || '';
    const kind = worldFeatureKindFromBrief(brief);
    if (!kind) throw new ApiError(409, 'The reviewed World change has no supported scene feature.');
    const placement = worldFeaturePlacement(id, proposal.district);
    await enforceRate(actor, 'build', 20);
    const feature = await rpc<PublishedFeature>('landville_publish_world_feature', {
      p_id: id, p_actor: actor, p_kind: kind, p_x: placement.x, p_y: placement.y,
    });
    return NextResponse.json({ feature });
  } catch (error) { return apiFailure(error); }
}
