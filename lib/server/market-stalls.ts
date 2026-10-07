import 'server-only';
import { ApiError } from '@/lib/server/api';
import { database } from '@/lib/server/database';

export type OwnedMarketDraft = {
  id: string;
  owner_wallet: string;
  base_service_id: string;
  title: string;
  instructions: string;
  updated_at: string;
};

export async function readOwnedMarketDraft(owner: string, id: string, revision: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(Date.parse(revision))) {
    throw new ApiError(400, 'Choose a saved service recipe.');
  }
  const rows = await database<OwnedMarketDraft[]>(
    `landville_market_stall_drafts?select=id,owner_wallet,base_service_id,title,instructions,updated_at&id=eq.${id}&owner_wallet=eq.${owner.toLowerCase()}&limit=1`,
  );
  const draft = rows[0];
  if (!draft) throw new ApiError(404, 'This service recipe was removed.');
  if (draft.updated_at !== revision) throw new ApiError(409, 'This service recipe changed. Refresh and try again.');
  return draft;
}
