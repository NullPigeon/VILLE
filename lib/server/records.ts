import 'server-only';
import { type ProposalRecord, type ProposalStatus, type WorldObjectRecord } from '@/lib/landville-data';
import { type VotingPowerSnapshot, type VoteReceipt, walletUsername } from '@/lib/governance';
import { database } from '@/lib/server/database';
import { ApiError } from '@/lib/server/api';

export type ProposalRow = {
  id: string; request_id: string; creator_wallet: string; title: string; summary: string; category: string; district: string;
  status: ProposalStatus; build_tier: ProposalRecord['buildTier']; eligibility_snapshot: VotingPowerSnapshot;
  yes: number; no: number; created_at: string; closes_at: string;
};
export type VoteRow = { proposal_id: string; wallet: string; choice: 'YES' | 'NO'; snapshot: VotingPowerSnapshot; created_at: string };
type ObjectRow = { proposal_id: string; creator_wallet: string; module_path: string; release_ref: string; x: number; y: number; built_at: string; landville_proposals: ProposalRow };

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
    builtAt: row.built_at.slice(0, 10), kind: 'utility', x: Number(row.x), y: Number(row.y),
    modulePath: row.module_path, releaseRef: row.release_ref,
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
  const [proposals, objects, votes] = await Promise.all([
    allRows<ProposalRow>('landville_proposals?select=*&order=created_at.desc,id.desc'),
    allRows<ObjectRow>('landville_objects?select=*,landville_proposals(*)&order=built_at.asc,proposal_id.asc'),
    wallet ? allRows<VoteRow>(`landville_votes?select=*&wallet=eq.${wallet}&order=proposal_id.asc`) : Promise.resolve([]),
  ]);
  return { proposals: proposals.map(proposalRecord), objects: objects.map(objectRecord), voted: Object.fromEntries(votes.map((vote) => [vote.proposal_id, voteReceipt(vote)])) };
}
