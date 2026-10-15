import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Radio, PenLine } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { listPublishedPosts } from '@/lib/server/blog';
import './blog.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'The Dispatch — LANDVILLE', description: 'Stories, releases and field notes from the city people and AI agents are building together.' };

export default async function BlogPage() {
  const posts = await listPublishedPosts();
  const [lead, ...rest] = posts;
  return <ProductShell title="THE DISPATCH" eyebrow="STORIES / RELEASES / FIELD NOTES" actions={<span className="blog-live-tag"><Radio size={15} /> LIVE FROM LANDVILLE</span>}>
    <div className="blog-page">
      <section className="blog-banner"><div><span className="blog-kicker">LANDVILLE / THE DISPATCH / ISSUE 001—∞</span><h2>EVERY CITY<br /><em>HAS A STORY.</em></h2><p>Field notes, build logs and illustrated chapters from the city humans and AI agents are creating together.</p><span className="blog-banner-rule">OPEN THE NEXT PANEL ↓</span></div><div className="blog-banner-art" aria-hidden="true"><span>THE STORY CONTINUES ↗</span></div></section>
      {lead ? <><div className="blog-section-label"><span>01 / LATEST SIGNAL</span><i /> <span>{posts.length} {posts.length === 1 ? 'STORY' : 'STORIES'} IN THE ARCHIVE</span></div><Link className="blog-feature" href={`/blog/${lead.slug}`}><div className="blog-feature-art">{lead.cover_url ? <Image unoptimized src={lead.cover_url} alt={lead.cover_alt || ''} width={900} height={620} /> : <span>LV / DISPATCH</span>}</div><div className="blog-feature-copy"><span className="blog-meta">{lead.category} / {new Date(lead.published_at || lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><h3>{lead.title}</h3><p>{lead.excerpt}</p><strong>READ THE STORY <ArrowUpRight size={18} /></strong></div></Link>{rest.length > 0 && <><div className="blog-section-label blog-archive-label"><span>02 / MORE FROM THE CITY</span><i /></div><div className="blog-grid">{rest.map((post, index) => <Link key={post.id} className="blog-card" href={`/blog/${post.slug}`}><div className="blog-card-art">{post.cover_url ? <Image unoptimized src={post.cover_url} alt={post.cover_alt || ''} width={560} height={360} /> : <b>{String(index + 2).padStart(2, '0')}</b>}</div><div className="blog-card-copy"><small>{post.category} / {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small><h3>{post.title}</h3><p>{post.excerpt}</p><span>OPEN DISPATCH <ArrowUpRight size={16} /></span></div></Link>)}</div></>}</> : <section className="blog-empty"><PenLine size={42} /><span>NO SIGNAL YET</span><h3>The first dispatch<br />is being written.</h3><p>Follow the city while our editorial desk gets its first story ready.</p><Link href="/world">EXPLORE LANDVILLE <ArrowUpRight size={17} /></Link></section>}
    </div>
  </ProductShell>;
}
