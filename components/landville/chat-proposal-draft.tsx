'use client';
import { WORLD_DISTRICTS } from '@/lib/world-districts';
import { useState } from 'react';
import Link from 'next/link';
import { useLandville } from '@/components/landville/provider';
import { WorldFeatureArt } from '@/components/landville/world-feature-art';
import { WorldBuildingArt } from '@/components/landville/world-building-art';
import { buildingDesignFromBrief, buildingFinishFromBrief } from '@/lib/building-design';
import type { WorldFeatureKind } from '@/lib/world-change';
import '@/app/proposals/world-change-proposals.css';

export function ChatProposalDraft({
  sourceReplyId,
  titleText,
  summaryText,
  initialDistrict = 'THE DUMP',
  worldFeatureKind,
  onClose,
}: {
  sourceReplyId: string;
  titleText: string;
  summaryText: string;
  initialDistrict?: string;
  worldFeatureKind?: WorldFeatureKind | null;
  onClose(): void;
}) {
  const { createProposal, activeProposals, status } = useLandville();
  const atLimit = activeProposals.length >= 2;
  const [draft, setDraft] = useState({
    category: worldFeatureKind ? 'WORLD' : 'UTILITY',
    district: WORLD_DISTRICTS.some((item) => item.proposalLabel === initialDistrict) ? initialDistrict : 'THE DUMP',
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [created, setCreated] = useState('');
  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (busy || created || atLimit || status !== 'ready') return;
    setBusy(true);
    setNotice(worldFeatureKind ? 'Submitting your World change…' : 'Submitting your building plan…');
    try {
      const proposal = await createProposal({ ...draft, sourceReplyId });
      setCreated(proposal.id);
      setNotice(
        `Vote opened. Deadline: ${new Date(proposal.closesAt || '').toLocaleString()}.`,
      );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="proposal-form" id="proposal-draft" onSubmit={submit}>
      <h3>{worldFeatureKind ? 'Put this World change to a vote.' : 'Put this building to a vote.'}</h3>
      <p>
        Read Scrapy’s plan below. If it looks right, submit it for the town to decide. You can go back to chat to change the idea.
      </p>
      {worldFeatureKind ? <div className="world-change-draft-preview"><WorldFeatureArt kind={worldFeatureKind} /><span>SCENE PREVIEW · {worldFeatureKind.replaceAll('_', ' ')}<small>LANDVILLE colors · inked outline · final position reviewed before release</small></span></div> : <div className="world-building-draft-preview"><WorldBuildingArt kind="utility" seed={sourceReplyId} title={titleText} description={summaryText} /><span>BUILDING CONCEPT · {buildingDesignFromBrief(summaryText, titleText, 'utility')}<small>{buildingFinishFromBrief(summaryText).material.toLowerCase()} metal · {buildingFinishFromBrief(summaryText).accent.toLowerCase()} neon. After the vote, Scrapy generates a unique image from the approved plan. It appears in World only after visual review and release.</small></span></div>}
      <label>
        OBJECT NAME
        <input value={titleText} readOnly />
      </label>
      <label>
        WHAT WILL IT DO?
        <textarea value={summaryText} readOnly />
      </label>
      {!worldFeatureKind && <details><summary>Change building category (optional)</summary><label>
        CATEGORY
        <select value={draft.category} disabled={busy || Boolean(created)} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
          {['UTILITY', 'GAME', 'ART', 'MEME', 'TOKEN', 'OTHER'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label></details>}
      <label>
        DISTRICT
        <select
          value={draft.district}
          disabled={busy || Boolean(created)}
          onChange={(event) =>
            setDraft({ ...draft, district: event.target.value })
          }
        >
          {WORLD_DISTRICTS.map((item) => (
            <option key={item.id} value={item.proposalLabel}>
              {item.proposalLabel}
            </option>
          ))}
        </select>
      </label>
      {activeProposals.length > 0 && !created && (
        <p>
          Your active proposals:{' '}
          {activeProposals.map((proposal, index) => (
            <span key={proposal.id}>
              {index > 0 && ' · '}
              <Link href={`/proposals#${proposal.id}`}>{proposal.id}</Link>
            </span>
          ))}
          .{' '}
          {atLimit
            ? 'At least one must be built or rejected before you can submit a third.'
            : 'You can submit one more.'}
        </p>
      )}
      {notice && <output aria-live="polite">{notice}</output>}
      {created ? (
        <Link className="lv-button primary" href={`/proposals#${created}`}>
          VIEW {created}
        </Link>
      ) : (
        <button
          className="lv-button primary"
          disabled={busy || atLimit || status !== 'ready'}
        >
          {busy
            ? 'SUBMITTING…'
            : atLimit
              ? 'TWO ACTIVE PROPOSALS'
              : 'CONFIRM + OPEN VOTING'}
        </button>
      )}
      <button
        type="button"
        className="lv-button"
        disabled={busy}
        onClick={onClose}
      >
          {created ? 'CLOSE' : 'BACK TO CHAT'}
      </button>
    </form>
  );
}
