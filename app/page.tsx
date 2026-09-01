'use client';

import { FormEvent, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Bot, Building2, CheckCircle2, ChevronRight, CircleDollarSign, Crown, Eye, Hammer, MapPin, Menu, MessageSquare, Plus, Send, Sparkles, User, Vote, X } from 'lucide-react';

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

function reply(message: string) {
  const m = message.toLowerCase();
  if (m.includes('token') || m.includes('swap')) return 'A token swap? Beautiful. Another machine for degenerates to turn good tokens into worse tokens. Want to put the less-terrible version to a vote?';
  if (m.includes('casino')) return 'We already have a casino. It is, regrettably, popular. Give me one weird detail and I’ll make yours distinct.';
  return 'Not immediately terrible. Tell me what it does for the citizens, and I’ll see if it survives the planning department. That’s me. Unfortunately.';
}

export default function Home() {
  const [chat, setChat] = useState(false);
  const [menu, setMenu] = useState(false);
  const [input, setInput] = useState('');
  const [voted, setVoted] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<{title:string; district:string; author:string; yes:number} | null>(null);
  const [proposal, setProposal] = useState<'idle' | 'preview' | 'live' | 'built'>('idle');
  const [proposalVote, setProposalVote] = useState(false);
  const [messages, setMessages] = useState([{ who: 'SCRAPY', text: 'Landville is online. What are we irresponsibly building today?' }]);
  const send = (event: FormEvent) => {
    event.preventDefault(); const text = input.trim(); if (!text) return;
    setMessages((m) => [...m, { who: 'YOU', text }, { who: 'SCRAPY', text: reply(text) }]); setInput('');
  };
  const showConcept = () => { setChat(false); setProposal('preview'); };
  return <main>
    <div className="noise" aria-hidden="true" />
    <header className="site-header">
      <a className="logo" href="#top">LANDVILLE<span>™</span></a>
      <nav className={menu ? 'nav open' : 'nav'}><a href="#world" onClick={() => setMenu(false)}>WORLD</a><a href="#votes" onClick={() => setMenu(false)}>VOTE</a><a href="#about" onClick={() => setMenu(false)}>ABOUT</a><button onClick={() => {setChat(true);setMenu(false)}}><Bot /> MAYOR</button></nav>
      <button className="menu" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">{menu ? <X /> : <Menu />}</button>
    </header>

    <section id="top" className="hero shell">
      <div><p className="eyebrow"><i /> RESIDENT #0001 IS ONLINE</p><h1>A DIGITAL TOWN<br />BUILT BY THE <em>INTERNET.</em></h1><p className="intro">You imagine. We vote. Landville builds.<br />No roadmap survives the junkyard.</p><div className="actions"><a href="#world" className="button acid">ENTER LANDVILLE <ArrowDownRight /></a><button className="button" onClick={() => setChat(true)}>TALK TO MAYOR <MessageSquare /></button></div><p className="pulse"><i /> 2,418 CITIZENS CAUSING PROBLEMS</p></div>
      <div className="hero-art"><img src="/scrapy-sheet.png" alt="Mayor Scrapy character sheet" /><div className="mayor-title">MAYOR<br /><b>SCRAPY</b><Crown /></div><div className="bubble">ANOTHER IDEA?<br /><b>NICE.</b><small>Let’s see if it’s worth the mess.</small></div><div className="tag">BUILT FROM<br />TRASH + COFFEE</div></div>
    </section>
    <div className="marquee">YOU IMAGINE <i>✦</i> WE VOTE <i>✦</i> LANDVILLE BUILDS <i>✦</i> YOU IMAGINE <i>✦</i> WE VOTE <i>✦</i> LANDVILLE BUILDS <i>✦</i></div>

    <section className="shell how" aria-label="How Landville works"><p className="eyebrow"><i /> THE CIVIC PROCESS, ALLEGEDLY</p><div>{[['01','IMAGINE','Have a weird idea.'],['02','TALK','Tell Mayor Scrapy.'],['03','PROPOSE','Make it buildable.'],['04','VOTE','Citizens decide.'],['05','BUILD','It joins the town.'],['06','LIVE','Regret it forever.']].map(([n,title,text])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section id="world" className="shell world"><div className="heading"><div><p className="eyebrow"><i /> LIVE WORLD / LANDFILLE</p><h2>THE TOWN GOT<br />WORSE. <em>GOOD.</em></h2></div><p>Every strange thing in here was imagined by someone, voted on by everyone, then made permanent.</p></div>
      <div className="world-frame"><img src="/landville-reference.png" alt="The neon junkyard city of Landville" /><div className="overlay" /><button className="label casino" onClick={()=>setSelectedObject({title:'GIANT FROG CASINO',district:'TOKEN ALLEY',author:'@degen69',yes:73})}><MapPin /> FROG CASINO</button><button className="label museum" onClick={()=>setSelectedObject({title:'MEME MUSEUM',district:'THE DUMP',author:'@pixelgraver',yes:61})}><MapPin /> MEME MUSEUM</button><button className="label market" onClick={()=>setSelectedObject({title:'LANDVILLE RADIO',district:'MARKET',author:'@radio_rat',yes:88})}><MapPin /> MARKET</button>{proposal==='built'&&<button className="label swap" onClick={()=>setSelectedObject({title:'PHYSICAL TOKEN SWAP',district:'TOKEN ALLEY',author:'@you',yes:74})}><MapPin /> NEW: TOKEN SWAP</button>}<div className="map-controls"><button aria-label="Zoom in"><Plus /></button><button aria-label="Explore map"><ArrowUpRight /></button></div><div className="world-feed"><small>LIVE BUILD FEED</small><b>{proposal==='built'?'A new machine just landed.':'3 new objects this week.'}</b><span>{proposal==='built'?'Built by @you. Democracy survived.':'Two were useful. We’re investigating.'}</span></div></div>
      <div className="projects">{projects.map(([title,district,author,yes],i) => <article key={title as string}><button className="project-hit" aria-label={`Inspect ${title}`} onClick={()=>setSelectedObject({title:title as string,district:district as string,author:author as string,yes:yes as number})}/><span>0{i+1}</span><div className="building"><Building2 /></div><p>{district}</p><h3>{title}</h3><footer>BUILT BY {author}<b>{yes}% <small>VOTED YES</small></b></footer></article>)}{proposal==='built'&&<article className="fresh"><button className="project-hit" aria-label="Inspect Physical Token Swap" onClick={()=>setSelectedObject({title:'PHYSICAL TOKEN SWAP',district:'TOKEN ALLEY',author:'@you',yes:74})}/><span>04 / JUST BUILT</span><div className="building"><Hammer /></div><p>TOKEN ALLEY</p><h3>PHYSICAL TOKEN SWAP</h3><footer>BUILT BY @you<b>74% <small>VOTED YES</small></b></footer></article>}</div>
    </section>

    <section id="votes" className="vote-section"><div className="shell vote-layout"><div className="vote-intro"><p className="eyebrow"><i /> CITIZENS DECIDE</p><h2>MAKE THEM<br /><em>VOTE.</em></h2><p>Landville does not need another committee. It needs a giant green button and people with opinions.</p><button className="button acid" onClick={() => setChat(true)}>START A PROPOSAL <ArrowUpRight /></button></div><div className="vote-stack">{votes.map(([title,author,yes,time]) => <article key={title as string}><header><span>PROPOSAL LIVE</span><time>{time}</time></header><h3>{title}</h3><p>Proposed by {author}</p><div className="meter"><i style={{width:`${yes}%`}} /></div><footer><b><em>{yes}%</em> YES</b><span>{100-(yes as number)}% NO</span><button onClick={() => setVoted(title as string)}>{voted === title ? 'VOTED ✓' : 'VOTE'} <Vote /></button></footer></article>)}</div></div></section>

    <section id="about" className="shell mayor"><div className="mayor-photo"><img src="/scrapy-sheet.png" alt="Mayor Scrapy" /><b>HE RUNS ON<br /><strong>CHAOS + COFFEE</strong></b></div><div><p className="eyebrow"><i /> MEET THE MAYOR</p><h2>MAYOR SCRAPY<br />IS <em>LISTENING.</em></h2><p>He is an AI mayor, builder, engineer, town clerk and occasional obstacle. He loves weird ideas, hates boring ones, and quietly wants this town to work.</p><blockquote>“OF COURSE. CIVILIZATION LASTED ALMOST SIX MINUTES.”</blockquote><button className="text-link" onClick={() => setChat(true)}>BOTHER THE MAYOR <ChevronRight /></button></div></section>
    <section className="shell news"><article className="paper"><p>THE LANDFILL TIMES</p><h2>TODAY IN LANDVILLE</h2><ul><li>Three buildings appeared.</li><li>Two were useful.</li><li>We’re investigating.</li></ul><a href="#world">READ THE FULL MESS <ArrowUpRight /></a></article><article className="treasury"><CircleDollarSign /><div><p>COMMUNITY TREASURY</p><h2>$1,250,420.69</h2><small>READ-ONLY. MAYOR DOES NOT GET THE KEYS.</small></div><a href="#votes"><ChevronRight /></a></article></section>
    <footer className="site-footer"><a className="logo" href="#top">LANDVILLE<span>™</span></a><p>THIS IS NOT JUST A WEBSITE. IT’S A TOWN.</p><span>© 2026 THE INTERNET</span></footer>
    {chat && <aside className="chat" aria-label="Mayor Scrapy chat"><header><div className="bot"><Bot /></div><div><b>MAYOR SCRAPY</b><small><i /> ONLINE / DOCKED</small></div><button onClick={() => setChat(false)} aria-label="Close mayor chat"><X /></button></header><div className="thread">{messages.map((m,i) => <div className={m.who === 'YOU' ? 'message you' : 'message'} key={i}><small>{m.who}</small><p>{m.text}</p></div>)}</div><button className="concept" onClick={showConcept}><Sparkles /><div><small>{messages.length>1?'CONCEPT READY':'TRY THE DEMO IDEA'}</small><b>MAKE A TOKEN SWAP, BUT PHYSICAL</b></div><ChevronRight /></button><form onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Tell Mayor what Landville needs..." aria-label="Message Mayor Scrapy" /><button aria-label="Send"><Send /></button></form></aside>}
    {selectedObject&&<div className="modal-backdrop" onMouseDown={()=>setSelectedObject(null)}><section className="object-modal" onMouseDown={e=>e.stopPropagation()} aria-modal="true"><button className="modal-close" onClick={()=>setSelectedObject(null)}><X /></button><p className="eyebrow"><i /> WORLD OBJECT / BUILT</p><div className="object-icon"><Building2 /></div><small>{selectedObject.district}</small><h2>{selectedObject.title}</h2><p>It exists because somebody suggested it and the citizens failed to stop them.</p><dl><div><dt>BUILT BY</dt><dd><User /> {selectedObject.author}</dd></div><div><dt>FINAL VOTE</dt><dd>{selectedObject.yes}% YES</dd></div><div><dt>STATUS</dt><dd><CheckCircle2 /> PERMANENT</dd></div></dl><button className="button acid" onClick={()=>{setSelectedObject(null);setChat(true)}}>ASK MAYOR ABOUT IT <MessageSquare /></button></section></div>}
    {proposal!=='idle'&&proposal!=='built'&&<div className="modal-backdrop"><section className="proposal-modal" aria-modal="true"><button className="modal-close" onClick={()=>setProposal('idle')}><X /></button><p className="eyebrow"><i /> {proposal==='preview'?'PROPOSAL PREVIEW':'VOTE OPEN'}</p><div className="proposal-title"><Sparkles /><div><small>CONCEPT #0042</small><h2>PHYSICAL TOKEN SWAP</h2></div></div><p>A rusted street machine where citizens pick two tokens, crank an irresponsible brass lever, and watch rates flicker across a broken CRT.</p><dl><div><dt>DISTRICT</dt><dd>TOKEN ALLEY</dd></div><div><dt>PROPOSED BY</dt><dd>@you</dd></div><div><dt>MAYOR RISK</dt><dd>“HIGH, NATURALLY.”</dd></div></dl>{proposal==='preview'?<div className="modal-actions"><button className="button" onClick={()=>{setProposal('idle');setChat(true)}}>BACK TO CHAT</button><button className="button acid" onClick={()=>setProposal('live')}>SUBMIT PROPOSAL <ArrowUpRight /></button></div>:<><div className="big-meter"><i style={{width:proposalVote?'74%':'71%'}} /></div><div className="big-results"><b>{proposalVote?'74':'71'}% YES</b><span>{proposalVote?'26':'29'}% NO</span></div><button className="button acid full" onClick={()=>setProposalVote(true)}>{proposalVote?'YOUR VOTE: YES ✓':'VOTE YES'} <Vote /></button>{proposalVote&&<div className="admin-demo"><small>DEMO ADMIN CONTROL</small><p>Citizens voted. Production still needs a human.</p><button onClick={()=>setProposal('built')}><Hammer /> MARK APPROVED + BUILT</button></div>}</>}</section></div>}
  </main>;
}
