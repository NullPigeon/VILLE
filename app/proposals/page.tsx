'use client';

import { useMemo, useState } from 'react';
import { Bot, Plus, Vote } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const filters = ['ALL', 'LIVE', 'PASSED', 'BUILDING', 'BUILT'] as const;

export default function ProposalsPage() {
  const { proposals, voted, vote, createProposal } = useLandville();
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState('');
  const [form, setForm] = useState({ title: '', summary: '', category: 'UTILITY', district: 'THE DUMP' });
  const visible = useMemo(() => filter === 'ALL' ? proposals : proposals.filter((item) => item.status === filter), [filter, proposals]);

  function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (form.title.trim().length < 4 || form.summary.trim().length < 10) return;
    const record = createProposal({ ...form, title: form.title.trim().toUpperCase(), summary: form.summary.trim() });
    setCreated(record.id); setOpen(false); setFilter('ALL'); setForm({ title: '', summary: '', category: 'UTILITY', district: 'THE DUMP' });
  }

  return <ProductShell title="PROPOSALS" eyebrow="IMAGINE / ARGUE / VOTE" actions={<button className="lv-button primary" onClick={() => setOpen(true)}><Plus /> NEW PROPOSAL</button>}>
    {created && <div className="admin-warning" style={{borderColor:'var(--acid)',color:'var(--acid)',background:'#17200d'}}>PROPOSAL {created} IS LIVE. Democracy has been notified.</div>}
    <div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <section className="proposal-list">{visible.map((proposal) => {
      const total = proposal.yes + proposal.no;
      const yesPercent = Math.round((proposal.yes / Math.max(1,total))*100);
      return <article className="proposal-row" key={proposal.id}>
        <div className="proposal-id">{proposal.id}<b className={`status-tag ${proposal.status}`}>{proposal.status}</b><small>{proposal.closesIn}</small></div>
        <div className="proposal-copy"><small>{proposal.category} · {proposal.district} · {proposal.creator}</small><h2>{proposal.title}</h2><p>{proposal.summary}</p></div>
        <div className="vote-zone"><div className="vote-numbers"><b>{yesPercent}% YES · {proposal.yes.toLocaleString()}</b><span>{100-yesPercent}% NO · {proposal.no.toLocaleString()}</span></div><div className="vote-track"><i style={{width:`${yesPercent}%`}} /></div>{proposal.status === 'LIVE' ? <div className="vote-actions"><button disabled={Boolean(voted[proposal.id])} onClick={() => vote(proposal.id,'YES')}>{voted[proposal.id] === 'YES' ? 'VOTED YES ✓' : 'VOTE YES'}</button><button className="no" disabled={Boolean(voted[proposal.id])} onClick={() => vote(proposal.id,'NO')}>{voted[proposal.id] === 'NO' ? 'VOTED NO ✓' : 'VOTE NO'}</button></div> : <span className={`status-tag ${proposal.status}`}>{proposal.status === 'BUILDING' ? 'IN THE BUILD QUEUE' : 'VOTE CLOSED'}</span>}</div>
      </article>;
    })}{visible.length === 0 && <div className="empty-state"><Vote />No proposals in this pile.</div>}</section>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="border-[#59682d] bg-[#11130d] text-[#d5bd8d] sm:max-w-lg"><DialogHeader><DialogTitle className="text-2xl font-black text-[#c7ff00]">MAKE THEM VOTE.</DialogTitle><DialogDescription className="font-mono text-[#9b8966]">Mayor usually improves the idea first. We are skipping paperwork for this demo.</DialogDescription></DialogHeader><form className="proposal-form" onSubmit={submit}><label>THING NAME<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="GIANT FROG LIBRARY" required minLength={4} /></label><label>WHAT IS IT?<textarea value={form.summary} onChange={(e)=>setForm({...form,summary:e.target.value})} placeholder="Explain the useful part. If one exists." required minLength={10} /></label><label>CATEGORY<select value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}><option>UTILITY</option><option>GAME</option><option>ART</option><option>MEME</option><option>TOKEN</option><option>OTHER</option></select></label><label>DISTRICT<select value={form.district} onChange={(e)=>setForm({...form,district:e.target.value})}><option>THE DUMP</option><option>TOKEN ALLEY</option><option>MARKET</option><option>MEME PIT</option><option>TOWNWIDE</option></select></label><DialogFooter className="border-[#3f3824] bg-[#0c0d09]"><button type="button" className="lv-button" onClick={()=>setOpen(false)}>CANCEL</button><button className="lv-button primary" type="submit">SUBMIT PROPOSAL <Bot /></button></DialogFooter></form></DialogContent></Dialog>
  </ProductShell>;
}
