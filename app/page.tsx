'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/components/landville/wallet-provider';
import Image from 'next/image';
import { ArrowDownRight, ArrowUpRight, Bot, Building2, Check, CheckCircle2, ChevronRight, CircleDollarSign, Copy, Hammer, MapPin, Menu, MessageSquare, Plus, Radio, Send, Sparkles, TriangleAlert, User, Vote, Wrench, X } from 'lucide-react';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import { SCRAPY_TOKEN, scrapyTokenExplorerUrl } from '@/lib/scrapy-token';

const projects = [
  ['GIANT FROG CASINO', 'TOKEN ALLEY', '@degen69', 73],
  ['MEME MUSEUM', 'THE DUMP', '@pixelgraver', 61],
  ['LANDVILLE RADIO', 'MARKET', '@radio_rat', 88],
];
const votes = [
  ['PUT A MOON OVER THE DUMP', '@voidprinter', 64, '17H LEFT'],
  ['TOKEN SWAP — BUT PHYSICAL', '@degen69', 71, '1D LEFT'],
  ['BAN BEIGE', '@neonmoth', 92, '3H LEFT'],
];

const builderModules = [
  { id: 'place', label: 'PLACE', title: 'FROG CASINO', meta: 'NEW DESTINATION' },
  { id: 'tool', label: 'TOOL', title: 'TOKEN MACHINE', meta: 'INTERACTIVE UTILITY' },
  { id: 'game', label: 'GAME', title: 'DUMP RALLY', meta: 'PLAYABLE EVENT' },
  { id: 'culture', label: 'CULTURE', title: 'MEME MUSEUM', meta: 'PUBLIC ARCHIVE' },
];

function reply(message: string) {
  const m = message.toLowerCase();
  if (m.includes('token') || m.includes('swap')) return 'A token swap? Beautiful. Another machine for degenerates to turn good tokens into worse tokens. Want to put the less-terrible version to a vote?';
  if (m.includes('casino')) return 'We already have a casino. It is, regrettably, popular. Give me one weird detail and I’ll make yours distinct.';
  return 'Not immediately terrible. Tell me what it does for the citizens, and I’ll see if it survives the planning department. That’s me. Unfortunately.';
}

export default function Home() {
  const wallet = useWallet();
  const router = useRouter();
  const openWorkshop = () => router.push('/chat');
  const openVoting = () => router.push(wallet.address ? '/proposals' : '/citizens');
  const [chat, setChat] = useState(false);
  const [menu, setMenu] = useState(false);
  const [input, setInput] = useState('');
  const [voted] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<{title:string; district:string; author:string; yes:number} | null>(null);
  const [proposal, setProposal] = useState<'idle' | 'preview' | 'live' | 'built'>('idle');
  const [proposalVote, setProposalVote] = useState(false);
  const [builderModule, setBuilderModule] = useState(0);
  const [builderAdded, setBuilderAdded] = useState(false);
  const [contractCopied, setContractCopied] = useState(false);
  const [messages, setMessages] = useState([{ who: 'SCRAPY', text: 'Landville is online. What are we irresponsibly building today?' }]);
  const send = (event: { preventDefault(): void }) => {
    event.preventDefault(); const text = input.trim(); if (!text) return;
    setMessages((m) => [...m, { who: 'YOU', text }, { who: 'SCRAPY', text: reply(text) }]); setInput('');
  };
  const showConcept = () => { setChat(false); setProposal('preview'); };
  const copyContract = async () => {
    await navigator.clipboard.writeText(SCRAPY_TOKEN.address);
    setContractCopied(true);
    window.setTimeout(() => setContractCopied(false), 1800);
  };
  return <main>
    <div className="noise" aria-hidden="true" />
    <header className="site-header junk-header">
      <div className="brand-stack"><a className="logo" href="#top">LANDVILLE<span>™</span></a><small><Wrench /> PUBLIC WORLD ENGINE</small></div>
      <nav className={menu ? 'nav open junk-nav' : 'nav junk-nav'}><span className="nav-warning"><TriangleAlert /> BUILD ACCESS</span><Link href="/world" onClick={() => setMenu(false)}>01 / WORLD</Link><Link href="/proposals" onClick={() => setMenu(false)}>02 / VOTE</Link><a href="#about" onClick={() => setMenu(false)}>03 / HOW</a><Link href="/treasury" onClick={() => setMenu(false)}>04 / TREASURY</Link><button onClick={() => {openWorkshop();setMenu(false)}}><Bot /> 05 / TOWN CHAT</button><Link href="/citizens" onClick={() => setMenu(false)}><User /> {wallet.address ? 'MY PROFILE' : 'CREATE ACCOUNT'}</Link></nav>
      <button className="menu" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">{menu ? <X /> : <Menu />}</button>
    </header>

    <aside className="scrapy-token-strip" aria-label="$SCRAPY token contract">
      <div className="shell"><span className="scrapy-token-name"><i /> OFFICIAL TOKEN <strong>{SCRAPY_TOKEN.ticker}</strong></span><span className="scrapy-token-network">ROBINHOOD MAINNET / {SCRAPY_TOKEN.chainId}</span><code>{SCRAPY_TOKEN.address}</code><button type="button" onClick={() => void copyContract()}>{contractCopied ? <Check /> : <Copy />}{contractCopied ? 'COPIED' : 'COPY CA'}</button><a href={scrapyTokenExplorerUrl(activeRobinhoodChain.explorerUrl)} target="_blank" rel="noreferrer">VIEW CONTRACT <ArrowUpRight /></a></div>
    </aside>

    <section id="top" className="hero shell">
      <div className="chaos-note chaos-note-a" aria-hidden="true">MODULES MAY COLLIDE.<b>THAT IS THE POINT.</b></div>
      <div className="chaos-note chaos-note-b" aria-hidden="true">LIVE BUILD<br /><b>NO FINAL VERSION</b></div>
      <div className="chaos-arrow" aria-hidden="true">↳ PICK A MODULE</div>
      <div className="hero-copy"><div className="waste-badge"><TriangleAlert /><span>WORLD CONSTRUCTOR</span><b>PUBLIC BUILD / LIVE</b></div><p className="eyebrow"><i /> THE WEBSITE IS THE WORLD</p><h1>BUILD A WORLD.<br />WATCH THE SITE <em>GROW.</em></h1><p className="intro">Propose a place, tool, game or piece of culture.<br />Citizens vote. The approved idea becomes a real part of LANDVILLE.</p><div className="actions"><Link href="/world" className="button acid">OPEN WORLD CANVAS <ArrowDownRight /></Link><button className="button" onClick={() => openWorkshop()}>BUILD WITH SCRAPY <MessageSquare /></button></div><p className="pulse"><i /> EVERY APPROVED IDEA BECOMES A LIVE MODULE</p><div className="salvage-frequency"><Radio /> WORLD ENGINE 46.630 // COMMUNITY WRITE ACCESS</div></div>
      <div className="constructor-demo junk-frame">
        <i className="rivet r1" /><i className="rivet r2" /><i className="rivet r3" /><i className="rivet r4" />
        <header className="constructor-head"><div><small>LANDVILLE / WORLD CONSTRUCTOR</small><b>ADD SOMETHING TO REALITY</b></div><span><i /> LIVE CANVAS</span></header>
        <div className="constructor-body">
          <aside className="module-palette"><small>MODULE PALETTE</small>{builderModules.map((module,index)=><button key={module.id} className={builderModule===index?'active':''} onClick={()=>{setBuilderModule(index);setBuilderAdded(false)}}><span>0{index+1}</span><b>{module.label}</b><small>{module.meta}</small></button>)}</aside>
          <div className="constructor-canvas"><Image src="/landville-reference.png" alt="LANDVILLE world under construction" width={1256} height={1256} priority /><div className="build-grid" /><span className="canvas-label">THE WEBSITE / THE WORLD</span><div className="world-module module-one"><Building2 /><b>CASINO</b><small>LIVE</small></div><div className="world-module module-two"><Radio /><b>RADIO</b><small>LIVE</small></div><div className={builderAdded?'world-module module-new placed':'world-module module-new'}><Plus /><b>{builderModules[builderModule].title}</b><small>{builderAdded?'ADDED TO CANVAS':'PREVIEW'}</small></div><div className="scrapy-operator"><Image src="/scrapy-sheet.png" alt="Mayor Scrapy operating the constructor" width={1536} height={1024} /><span><Bot /> SCRAPY<br /><b>BUILD OPERATOR</b></span></div></div>
        </div>
        <footer className="constructor-footer"><div><small>SELECTED MODULE</small><b>{builderModules[builderModule].label} / {builderModules[builderModule].title}</b></div><button onClick={()=>setBuilderAdded(true)}>{builderAdded?<><CheckCircle2 /> ADDED TO WORLD</>:<><Plus /> ADD MODULE</>}</button></footer>
      </div>
    </section>
    <div className="marquee">IDEA → MODULE <i>✦</i> MODULE → PROPOSAL <i>✦</i> PROPOSAL → VOTE <i>✦</i> VOTE → BUILD <i>✦</i> BUILD → WORLD <i>✦</i></div>

    <section className="shell how chaos-section" aria-label="How Landville works"><div className="torn-caption" aria-hidden="true">THE SITE IS<br />NEVER FINISHED</div><p className="eyebrow"><i /> HOW THE WORLD EXPANDS</p><div>{[['01','IMAGINE','Invent a place, page, tool or game.'],['02','TALK','Scrapy turns chaos into a buildable concept.'],['03','PROPOSE','Define what this module adds to the world.'],['04','VOTE','Every wallet gets 1 vote. Each 250,000 SCRAPY adds +1.'],['05','BUILD','The idea becomes an actual site module.'],['06','LIVE','LANDVILLE grows for every citizen.']].map(([n,title,text])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section id="world" className="shell world chaos-section"><div className="section-stamp" aria-hidden="true">CURRENT BUILD<br /><b>PERMANENTLY UNFINISHED</b></div><div className="heading"><div><p className="eyebrow"><i /> LIVE WORLD / PUBLIC BUILD</p><h2>THE WEBSITE<br />IS THE <em>WORLD.</em></h2></div><p>Every approved object adds a destination, interaction, page or rule. LANDVILLE does not display the town — LANDVILLE is the town.</p></div>
      <div className="world-frame"><img src="/landville-reference.png" alt="The neon junkyard city of Landville" /><div className="overlay" /><button className="label casino" onClick={()=>setSelectedObject({title:'GIANT FROG CASINO',district:'TOKEN ALLEY',author:'@degen69',yes:73})}><MapPin /> FROG CASINO</button><button className="label museum" onClick={()=>setSelectedObject({title:'MEME MUSEUM',district:'THE DUMP',author:'@pixelgraver',yes:61})}><MapPin /> MEME MUSEUM</button><button className="label market" onClick={()=>setSelectedObject({title:'LANDVILLE RADIO',district:'MARKET',author:'@radio_rat',yes:88})}><MapPin /> MARKET</button>{proposal==='built'&&<button className="label swap" onClick={()=>setSelectedObject({title:'PHYSICAL TOKEN SWAP',district:'TOKEN ALLEY',author:'@you',yes:74})}><MapPin /> NEW: TOKEN SWAP</button>}<div className="map-controls"><button aria-label="Zoom in"><Plus /></button><button aria-label="Explore map"><ArrowUpRight /></button></div><div className="world-feed"><small>LIVE BUILD FEED</small><b>{proposal==='built'?'A new machine just landed.':'3 new objects this week.'}</b><span>{proposal==='built'?'Built by @you. Democracy survived.':'Two were useful. We’re investigating.'}</span></div></div>
      <div className="projects">{projects.map(([title,district,author,yes],i) => <article key={title as string}><button className="project-hit" aria-label={`Inspect ${title}`} onClick={()=>setSelectedObject({title:title as string,district:district as string,author:author as string,yes:yes as number})}/><span>0{i+1}</span><div className="building"><Building2 /></div><p>{district}</p><h3>{title}</h3><footer>BUILT BY {author}<b>{yes}% <small>VOTED YES</small></b></footer></article>)}{proposal==='built'&&<article className="fresh"><button className="project-hit" aria-label="Inspect Physical Token Swap" onClick={()=>setSelectedObject({title:'PHYSICAL TOKEN SWAP',district:'TOKEN ALLEY',author:'@you',yes:74})}/><span>04 / JUST BUILT</span><div className="building"><Hammer /></div><p>TOKEN ALLEY</p><h3>PHYSICAL TOKEN SWAP</h3><footer>BUILT BY @you<b>74% <small>VOTED YES</small></b></footer></article>}</div>
    </section>

    <section id="votes" className="vote-section chaos-vote"><div className="vote-scribble" aria-hidden="true">NO QUIET<br />OPINIONS</div><div className="shell vote-layout"><div className="vote-intro"><p className="eyebrow"><i /> CITIZENS DECIDE</p><h2>MAKE THEM<br /><em>VOTE.</em></h2><p>Landville does not need another committee. It needs a giant green button and people with opinions.</p><button className="button acid" onClick={() => openWorkshop()}>START A PROPOSAL <ArrowUpRight /></button></div><div className="vote-stack">{votes.map(([title,author,yes,time]) => <article key={title as string}><header><span>PROPOSAL LIVE</span><time>{time}</time></header><h3>{title}</h3><p>Proposed by {author}</p><div className="meter"><i style={{width:`${yes}%`}} /></div><footer><b><em>{yes}%</em> YES</b><span>{100-(yes as number)}% NO</span><button onClick={() => openVoting()}>{voted === title ? 'VOTED ✓' : 'VOTE'} <Vote /></button></footer></article>)}</div></div></section>

    <section id="about" className="shell mayor chaos-section"><div className="mayor-photo"><img src="/scrapy-sheet.png" alt="Mayor Scrapy" /><b>HE RUNS ON<br /><strong>CHAOS + COFFEE</strong></b><span className="photo-sticker">WARRANTY VOID<br />SINCE BOOT</span></div><div><p className="eyebrow"><i /> MEET THE MAYOR</p><h2>MAYOR SCRAPY<br />IS <em>LISTENING.</em></h2><p>He is an AI mayor, builder, engineer, town clerk and occasional obstacle. He loves weird ideas, hates boring ones, and quietly wants this town to work.</p><blockquote>“OF COURSE. CIVILIZATION LASTED ALMOST SIX MINUTES.”</blockquote><button className="text-link" onClick={() => openWorkshop()}>BOTHER THE MAYOR <ChevronRight /></button></div></section>
    <section className="shell news"><article className="paper"><p>THE LANDFILL TIMES</p><h2>TODAY IN LANDVILLE</h2><ul><li>Three buildings appeared.</li><li>Two were useful.</li><li>We’re investigating.</li></ul><a href="/world">READ THE FULL MESS <ArrowUpRight /></a></article><article className="treasury"><CircleDollarSign /><div><p>COMMUNITY TREASURY</p><h2>$1,250,420.69</h2><small>READ-ONLY. MAYOR DOES NOT GET THE KEYS.</small></div><a href="/treasury"><ChevronRight /></a></article></section>
    <footer className="site-footer chaos-footer"><a className="logo" href="#top">LANDVILLE<span>™</span></a><p>THIS IS NOT JUST A WEBSITE. IT’S A WORLD CONSTRUCTOR.</p><b>NO FINAL VERSION</b><span>© 2026 THE INTERNET</span></footer>
    {chat && <aside className="chat" aria-label="Mayor Scrapy chat"><header><div className="bot"><Bot /></div><div><b>MAYOR SCRAPY</b><small><i /> ONLINE / DOCKED</small></div><button onClick={() => setChat(false)} aria-label="Close mayor chat"><X /></button></header><div className="thread">{messages.map((m,i) => <div className={m.who === 'YOU' ? 'message you' : 'message'} key={i}><small>{m.who}</small><p>{m.text}</p></div>)}</div><button className="concept" onClick={showConcept}><Sparkles /><div><small>{messages.length>1?'CONCEPT READY':'TRY THE DEMO IDEA'}</small><b>MAKE A TOKEN SWAP, BUT PHYSICAL</b></div><ChevronRight /></button><form onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Tell Mayor what Landville needs..." aria-label="Message Mayor Scrapy" /><button aria-label="Send"><Send /></button></form></aside>}
    {selectedObject&&<div className="modal-backdrop" onMouseDown={()=>setSelectedObject(null)}><section className="object-modal" onMouseDown={e=>e.stopPropagation()} aria-modal="true"><button className="modal-close" onClick={()=>setSelectedObject(null)}><X /></button><p className="eyebrow"><i /> WORLD OBJECT / BUILT</p><div className="object-icon"><Building2 /></div><small>{selectedObject.district}</small><h2>{selectedObject.title}</h2><p>It exists because somebody suggested it and the citizens failed to stop them.</p><dl><div><dt>BUILT BY</dt><dd><User /> {selectedObject.author}</dd></div><div><dt>FINAL VOTE</dt><dd>{selectedObject.yes}% YES</dd></div><div><dt>STATUS</dt><dd><CheckCircle2 /> PERMANENT</dd></div></dl><button className="button acid" onClick={()=>{setSelectedObject(null);openWorkshop()}}>ASK MAYOR ABOUT IT <MessageSquare /></button></section></div>}
    {proposal!=='idle'&&proposal!=='built'&&<div className="modal-backdrop"><section className="proposal-modal" aria-modal="true"><button className="modal-close" onClick={()=>setProposal('idle')}><X /></button><p className="eyebrow"><i /> {proposal==='preview'?'PROPOSAL PREVIEW':'VOTE OPEN'}</p><div className="proposal-title"><Sparkles /><div><small>CONCEPT #0042</small><h2>PHYSICAL TOKEN SWAP</h2></div></div><p>A rusted street machine where citizens pick two tokens, crank an irresponsible brass lever, and watch rates flicker across a broken CRT.</p><dl><div><dt>DISTRICT</dt><dd>TOKEN ALLEY</dd></div><div><dt>PROPOSED BY</dt><dd>@you</dd></div><div><dt>MAYOR RISK</dt><dd>“HIGH, NATURALLY.”</dd></div></dl>{proposal==='preview'?<div className="modal-actions"><button className="button" onClick={()=>{setProposal('idle');openWorkshop()}}>BACK TO CHAT</button><button className="button acid" onClick={()=>setProposal('live')}>SUBMIT PROPOSAL <ArrowUpRight /></button></div>:<><div className="big-meter"><i style={{width:proposalVote?'74%':'71%'}} /></div><div className="big-results"><b>{proposalVote?'74':'71'}% YES</b><span>{proposalVote?'26':'29'}% NO</span></div><button className="button acid full" onClick={()=>setProposalVote(true)}>{proposalVote?'YOUR VOTE: YES ✓':'VOTE YES'} <Vote /></button>{proposalVote&&<div className="admin-demo"><small>DEMO ADMIN CONTROL</small><p>Citizens voted. Production still needs a human.</p><button onClick={()=>setProposal('built')}><Hammer /> MARK APPROVED + BUILT</button></div>}</>}</section></div>}
  </main>;
}
