import 'server-only';
import { type ProposalRecord, type ProposalStatus, type WorldCitizenRecord, type WorldObjectRecord } from '@/lib/landville-data';
import { type VotingPowerSnapshot, type VoteReceipt, walletUsername } from '@/lib/governance';
import { database, rpc } from '@/lib/server/database';
import { ApiError } from '@/lib/server/api';
import { citizenIdentities } from '@/lib/server/citizens';
import { citizenLabel } from '@/lib/citizen-identity';
import type { WorldFeatureKind, WorldFeatureRecord } from '@/lib/world-change';

export type ProposalRow = {
  id: string; request_id: string; creator_wallet: string; title: string; summary: string; category: string; district: string;
  status: ProposalStatus; build_tier: ProposalRecord['buildTier']; eligibility_snapshot: VotingPowerSnapshot;
  yes: number; no: number; created_at: string; closes_at: string;
};
export type VoteRow = { proposal_id: string; wallet: string; choice: 'YES' | 'NO'; snapshot: VotingPowerSnapshot; created_at: string };
type ObjectRow = { proposal_id: string; creator_wallet: string; module_path: string; release_ref: string; x: number; y: number; built_at: string; landville_proposals: ProposalRow };
type WorldCitizenRow = { citizen_wallet: string; source_module_id: string; x: number; y: number; published_at: string };
type WorldFeatureRow = { proposal_id: string; kind: WorldFeatureKind; x: number; y: number; published_at: string; landville_proposals: { title: string; district: string } };
type ModuleLikeState = {
  modules: Record<string, { likes: number; likedByViewer: boolean }>;
  used: number;
  verifiedAllowance: number;
  weekStart: string;
  resetsAt: string;
};

export function proposalRecord(row: ProposalRow): ProposalRecord {
  const hoursLeft = Math.max(0, Math.ceil((Date.parse(row.closes_at) - Date.now()) / 3_600_000));
  return {
    id: row.id, creatorWallet: row.creator_wallet, creator: `@${walletUsername(row.creator_wallet)}`,
    title: row.title, summary: row.summary, category: row.category, district: row.district,
    status: row.status, buildTier: row.build_tier, eligibilitySnapshot: row.eligibility_snapshot,
    yes: Number(row.yes), no: Number(row.no), createdAt: row.created_at.slice(0, 10), closesAt: row.closes_at,
    closesIn: row.status !== 'LIVE' || hoursLeft === 0 ? 'ENDED' : hoursLeft > 48 ? `${Math.ceil(hoursLeft / 24)}D LEFT` : `${hoursLeft}H LEFT`,
  };
}

export function voteReceipt(row: VoteRow): VoteReceipt { return { ...row.snapshot, wallet: row.wallet, choice: row.choice }; }

export function objectRecord(row: ObjectRow): WorldObjectRecord {
  const proposal = row.landville_proposals;
  return {
    id: row.proposal_id, creatorWallet: row.creator_wallet, creator: `@${walletUsername(row.creator_wallet)}`,
    title: proposal.title, description: proposal.summary, district: proposal.district,
    yesPercent: Math.round(Number(proposal.yes) / Math.max(1, Number(proposal.yes) + Number(proposal.no)) * 100),
    builtAt: row.built_at.slice(0, 10), kind: ({ ART: 'art', GAME: 'venue', MEME: 'meme', TOKEN: 'media' } as const)[proposal.category as 'ART' | 'GAME' | 'MEME' | 'TOKEN'] || 'utility', x: Number(row.x), y: Number(row.y),
    modulePath: row.module_path, releaseRef: row.release_ref, likes: 0, likedByViewer: false,
  };
}

// PostgREST defaults to 1000 rows. Page explicitly rather than silently dropping records.
export async function allRows<T>(query: string) {
  const result: T[] = [];
  for (let offset = 0; offset < 10_000; offset += 500) {
    const rows = await database<T[]>(`${query}&limit=500&offset=${offset}`);
    result.push(...rows);
    if (rows.length < 500) return result;
  }
  throw new ApiError(503, 'This town needs a paginated view before loading more records.');
}

export async function readTown(wallet = '') {
  const [proposals, objects, citizens, worldFeatures, approvedArt, votes, likeState] = await Promise.all([
    allRows<ProposalRow>('landville_proposals?select=*&order=created_at.desc,id.desc'),
    allRows<ObjectRow>('landville_objects?select=*,landville_proposals(*)&order=built_at.asc,proposal_id.asc'),
    allRows<WorldCitizenRow>('landville_world_citizens?select=citizen_wallet,source_module_id,x,y,published_at&order=published_at.asc,citizen_wallet.asc'),
    allRows<WorldFeatureRow>('landville_world_features?select=proposal_id,kind,x,y,published_at,landville_proposals(title,district)&order=published_at.asc,proposal_id.asc').catch(() => [] as WorldFeatureRow[]),
    allRows<{ proposal_id: string }>('landville_building_art?select=proposal_id&state=eq.APPROVED&order=proposal_id.asc').catch(() => [] as Array<{ proposal_id: string }>),
    wallet ? allRows<VoteRow>(`landville_votes?select=*&wallet=eq.${wallet}&order=proposal_id.asc`) : Promise.resolve([]),
    rpc<ModuleLikeState>('landville_module_like_state', { p_wallet: wallet }),
  ]);
  const moduleLikes = likeState?.modules || {};
  const approvedBuildingIds = new Set(approvedArt.map((row) => row.proposal_id));
  const identities = await citizenIdentities([...proposals.map((row) => row.creator_wallet), ...objects.map((row) => row.creator_wallet), ...citizens.map((row) => row.citizen_wallet)]);
  return {
    proposals: proposals.map((row) => ({ ...proposalRecord(row), creator: citizenLabel(identities.get(row.creator_wallet)) })),
    objects: objects.map((row) => ({ ...objectRecord(row), creator: citizenLabel(identities.get(row.creator_wallet)),
      artApproved: approvedBuildingIds.has(row.proposal_id),
      likes: Number(moduleLikes[row.proposal_id]?.likes || 0),
      likedByViewer: Boolean(moduleLikes[row.proposal_id]?.likedByViewer) })),
    citizens: citizens.map((row): WorldCitizenRecord => ({ wallet: row.citizen_wallet, creator: citizenLabel(identities.get(row.citizen_wallet)),
      imagePath: `/api/world/citizens/${row.citizen_wallet}/image`, sourceModuleId: row.source_module_id,
      x: Number(row.x), y: Number(row.y), publishedAt: row.published_at })),
    worldFeatures: worldFeatures.map((row): WorldFeatureRecord => ({ proposalId: row.proposal_id, title: row.landville_proposals.title,
      district: row.landville_proposals.district, kind: row.kind, x: Number(row.x), y: Number(row.y), publishedAt: row.published_at })),
    voted: Object.fromEntries(votes.map((vote) => [vote.proposal_id, voteReceipt(vote)])),
    likeWeek: { used: Number(likeState.used || 0), verifiedAllowance: Number(likeState.verifiedAllowance || 5),
      weekStart: likeState.weekStart, resetsAt: likeState.resetsAt },
  };
}
