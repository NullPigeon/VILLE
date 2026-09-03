'use client';

import { useMemo, useState } from 'react';
import { Bot, Plus, Vote } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { BASE_VOTE_WEIGHT, shortWallet, TOKENS_PER_VOTE } from '@/lib/governance';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const filters = ['ALL', 'LIVE', 'PASSED', 'BUILDING', 'BUILT'] as const;

export default function ProposalsPage() {
  const { proposals, voted, vote, createProposal } = useLandville();
  const wallet = useWallet();
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState('');
  const [form, setForm] = useState({ title: '', summary: '', category: 'UTILITY', district: 'THE DUMP' });
  const [actionMessage, setActionMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const visible = useMemo(() => filter === 'ALL' ? proposals : proposals.filter((item) => item.status === filter), [filter, proposals]);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (form.title.trim().length < 4 || form.summary.trim().length < 10) return;
    setActionMessage('CHECKING SCRAPY HOLD AT THE CURRENT BLOCK…');
    try {
      const record = await createProposal({ ...form, title: form.title.trim().toUpperCase(), summary: form.summary.trim() });
      setCreated(record.id); setOpen(false); setFilter('ALL'); setForm({ title: '', summary: '', category: 'UTILITY', district: 'THE DUMP' });
      setActionMessage(`${record.eligibilitySnapshot?.weight || 0} VOTE POWER VERIFIED AT BLOCK ${record.eligibilitySnapshot?.blockNumber || 'UNKNOWN'}`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message.toUpperCase() : 'WALLET CHECK FAILED');
    }
  }

  async function castVote(id: string, choice: 'YES' | 'NO') {
    setBusyId(id);
    setActionMessage('SNAPSHOTTING SCRAPY HOLD…');
    try {
      const receipt = await vote(id, choice);
      setActionMessage(`${receipt.weight} VOTE${receipt.weight === 1 ? '' : 'S'} CAST · BLOCK ${receipt.blockNumber} · ${shortWallet(receipt.wallet)}`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message.toUpperCase() : 'VOTE FAILED');
    } finally {
      setBusyId('');
    }
  }

  return <ProductShell title="PROPOSALS" eyebrow="IMAGINE / HOLD / VOTE" actions={<button className="lv-button primary" onClick={() => setOpen(true)}><Plus /> NEW PROPOSAL</button>}>
    <section className="governance-rule"><div><small>VOTING RULE</small><strong>{BASE_VOTE_WEIGHT} BASE VOTE + 1 PER {TOKENS_PER_VOTE.toLocaleString('en-US')} SCRAPY</strong><span>No tokens required to vote. Each full 250,000 SCRAPY adds one vote. Your balance is checked at voting time.</span></div><div><small>YOUR CURRENT POWER</small><strong>{wallet.snapshot ? `${wallet.snapshot.weight} VOTES` : 'NOT CHECKED'}</strong><span>{wallet.address ? `${shortWallet(wallet.address)} · ${wallet.snapshot?.tokenBalanceFormatted || '—'} SCRAPY` : 'Connect and sign your wallet. No transaction.'}</span></div><button className="lv-button" onClick={() => wallet.address ? wallet.refreshVotingPower().catch(()=>undefined) : wallet.connectWallet().catch(()=>undefined)}>{wallet.address ? 'REFRESH HOLD' : 'CONNECT WALLET'}</button></section>
    {actionMessage && <div className="admin-warning" style={{borderColor:'var(--acid)',color:'var(--acid)',background:'#17200d'}}>{actionMessage}</div>}
    {created && <div className="admin-warning" style={{borderColor:'var(--acid)',color:'var(--acid)',background:'#17200d'}}>PROPOSAL {created} IS LIVE. Democracy has been notified.</div>}
    <div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <section className="proposal-list">{visible.map((proposal) => {
      const total = proposal.yes + proposal.no;
      const yesPercent = Math.round((proposal.yes / Math.max(1,total))*100);
      return <article className="proposal-row" key={proposal.id}>
        <div className="proposal-id">{proposal.id}<b className={`status-tag ${proposal.status}`}>{proposal.status}</b><small>{proposal.closesIn}</small></div>
        <div className="proposal-copy"><small>{proposal.category} · {proposal.district} · {proposal.creator}</small><h2>{proposal.title}</h2><p>{proposal.summary}</p></div>
        <div className="vote-zone"><div className="vote-numbers"><b>{yesPercent}% YES · {proposal.yes.toLocaleString()} POWER</b><span>{100-yesPercent}% NO · {proposal.no.toLocaleString()} POWER</span></div><div className="vote-track"><i style={{width:`${yesPercent}%`}} /></div>{proposal.status === 'LIVE' ? <div className="vote-actions"><button disabled={Boolean(voted[proposal.id]) || busyId === proposal.id} onClick={() => castVote(proposal.id,'YES')}>{voted[proposal.id]?.choice === 'YES' ? `VOTED YES ×${voted[proposal.id].weight} ✓` : 'VOTE YES'}</button><button className="no" disabled={Boolean(voted[proposal.id]) || busyId === proposal.id} onClick={() => castVote(proposal.id,'NO')}>{voted[proposal.id]?.choice === 'NO' ? `VOTED NO ×${voted[proposal.id].weight} ✓` : 'VOTE NO'}</button></div> : <span className={`status-tag ${proposal.status}`}>{proposal.status === 'BUILDING' ? 'IN THE BUILD QUEUE' : 'VOTE CLOSED'}</span>}{proposal.eligibilitySnapshot&&<small className="snapshot-line">PROPOSED WITH ×{proposal.eligibilitySnapshot.weight} POWER · BLOCK {proposal.eligibilitySnapshot.blockNumber}</small>}</div>
      </article>;
    })}{visible.length === 0 && <div className="empty-state"><Vote />No proposals in this pile.</div>}</section>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="border-[#59682d] bg-[#11130d] text-[#d5bd8d] sm:max-w-lg"><DialogHeader><DialogTitle className="text-2xl font-black text-[#c7ff00]">MAKE THEM VOTE.</DialogTitle><DialogDescription className="font-mono text-[#9b8966]">Build requests require at least 250,000 SCRAPY, checked at submission. Build-complexity tiers will be assigned during human review.</DialogDescription></DialogHeader><form className="proposal-form" onSubmit={submit}><label>THING NAME<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="GIANT FROG LIBRARY" required minLength={4} /></label><label>WHAT IS IT?<textarea value={form.summary} onChange={(e)=>setForm({...form,summary:e.target.value})} placeholder="Explain the useful part. If one exists." required minLength={10} /></label><label>CATEGORY<select value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}><option>UTILITY</option><option>GAME</option><option>ART</option><option>MEME</option><option>TOKEN</option><option>OTHER</option></select></label><label>DISTRICT<select value={form.district} onChange={(e)=>setForm({...form,district:e.target.value})}><option>THE DUMP</option><option>TOKEN ALLEY</option><option>MARKET</option><option>MEME PIT</option><option>TOWNWIDE</option></select></label><DialogFooter className="border-[#3f3824] bg-[#0c0d09]"><button type="button" className="lv-button" onClick={()=>setOpen(false)}>CANCEL</button><button className="lv-button primary" type="submit">VERIFY HOLD + SUBMIT <Bot /></button></DialogFooter></form></DialogContent></Dialog>
  </ProductShell>;
}
