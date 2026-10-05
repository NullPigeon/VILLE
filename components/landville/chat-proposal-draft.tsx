'use client';
import { WORLD_DISTRICTS } from '@/lib/world-districts';
import { useState } from 'react';
import Link from 'next/link';
import { useLandville } from '@/components/landville/provider';

export function ChatProposalDraft({
  sourceReplyId,
  titleText,
  summaryText,
  initialDistrict = 'THE DUMP',
  onClose,
}: {
  sourceReplyId: string;
  titleText: string;
  summaryText: string;
  initialDistrict?: string;
  onClose(): void;
}) {
  const { createProposal, activeProposals, status } = useLandville();
  const atLimit = activeProposals.length >= 2;
  const [draft, setDraft] = useState({
    category: 'UTILITY',
    district: WORLD_DISTRICTS.some((item) => item.proposalLabel === initialDistrict) ? initialDistrict : 'THE DUMP',
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [created, setCreated] = useState('');
  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (busy || created || atLimit || status !== 'ready') return;
    setBusy(true);
    setNotice('Checking your account and SCRAPY holdings…');
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
      <h3>Ready for the town?</h3>
      <p>
        Check the plan and district. Confirm to open voting.
        To change the idea, return to Scrapy first.
      </p>
      <label>
        OBJECT NAME
        <input value={titleText} readOnly />
      </label>
      <label>
        WHAT WILL IT DO?
        <textarea value={summaryText} readOnly />
      </label>
      <label>
        CATEGORY
        <select
          value={draft.category}
          disabled={busy || Boolean(created)}
          onChange={(event) =>
            setDraft({ ...draft, category: event.target.value })
          }
        >
          {['UTILITY', 'GAME', 'ART', 'MEME', 'TOKEN', 'OTHER'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
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
        {created ? 'CLOSE' : 'DISCARD DRAFT'}
      </button>
    </form>
  );
}
