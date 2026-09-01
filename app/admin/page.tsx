'use client';

import Link from 'next/link';
import { ArrowUpRight, Hammer, RotateCcw, ShieldAlert } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';

export default function AdminPage() {
  const { proposals, objects, setProposalStatus, resetDemo } = useLandville();
  const queue = proposals.filter((proposal) => proposal.status !== 'BUILT' && proposal.status !== 'REJECTED');
  return <ProductShell title="BUILD CONTROL" eyebrow="ADMIN DEMO / HUMAN APPROVAL REQUIRED" actions={<button className="lv-button danger" onClick={resetDemo}><RotateCcw /> RESET DEMO</button>}>
    <div className="admin-warning"><ShieldAlert /> LOCAL DEMO ONLY. Production admin requires server-side authentication, authorization, immutable audit logs and rate limits.</div>
    <div className="treasury-summary"><article className="metric-card"><small>IN QUEUE</small><strong>{queue.length}</strong><span>Awaiting judgment.</span></article><article className="metric-card"><small>WORLD OBJECTS</small><strong>{objects.length}</strong><span>Permanent-ish.</span></article><article className="metric-card"><small>BUILDING</small><strong>{proposals.filter((p)=>p.status==='BUILDING').length}</strong><span>Welding noises detected.</span></article></div>
    <section className="lv-panel"><header className="lv-panel-head"><h2><Hammer /> IMPLEMENTATION QUEUE</h2><span>STATE MACHINE DEMO</span></header><div style={{overflowX:'auto'}}><table className="build-table"><thead><tr><th>PROPOSAL</th><th>CREATOR</th><th>VOTE POWER</th><th>BUILD TIER</th><th>STATUS</th><th>HUMAN ACTION</th></tr></thead><tbody>{queue.map((proposal)=>{const yes=Math.round(proposal.yes/Math.max(1,proposal.yes+proposal.no)*100);return <tr key={proposal.id}><td data-label="PROPOSAL"><strong>{proposal.title}</strong><br />{proposal.id} · {proposal.district}</td><td data-label="CREATOR">{proposal.creator}</td><td data-label="VOTE POWER">{yes}% YES · {proposal.yes+proposal.no} TOTAL</td><td data-label="BUILD TIER">{proposal.buildTier||'LEGACY / UNRATED'}</td><td data-label="STATUS"><span className={`status-tag ${proposal.status}`}>{proposal.status}</span></td><td data-label="HUMAN ACTION"><div className="build-actions">{proposal.status==='LIVE'&&<button onClick={()=>setProposalStatus(proposal.id,'PASSED')}>CLOSE → PASSED</button>}{proposal.status==='PASSED'&&<button onClick={()=>setProposalStatus(proposal.id,'BUILDING')}>START BUILD</button>}{proposal.status==='BUILDING'&&<button onClick={()=>setProposalStatus(proposal.id,'BUILT')}>PUBLISH OBJECT</button>}<button className="reject" onClick={()=>setProposalStatus(proposal.id,'REJECTED')}>REJECT</button></div></td></tr>})}</tbody></table>{queue.length===0&&<div className="empty-state">Queue empty. Civilization may rest.</div>}</div></section>
    <div style={{marginTop:18}}><Link className="lv-button primary" href="/world">INSPECT PUBLISHED WORLD <ArrowUpRight /></Link></div>
  </ProductShell>;
}
