import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { BlogContent } from '@/components/landville/blog-content';
import { publishedPost } from '@/lib/server/blog';
import '../blog.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await publishedPost(slug);
  if (!post) return { title: 'Story not found — LANDVILLE' };
  return { title: `${post.title} — LANDVILLE Dispatch`, description: post.excerpt, openGraph: { title: post.title, description: post.excerpt, images: post.cover_url ? [post.cover_url] : undefined } };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await publishedPost(slug);
  if (!post) notFound();
  return <ProductShell title="THE DISPATCH" eyebrow="LANDVILLE / FIELD NOTES"><article className="blog-story"><Link className="blog-back" href="/blog"><ArrowLeft size={16} /> BACK TO THE DISPATCH</Link><header className="blog-story-header"><span className="blog-story-issue">THE DISPATCH / A LANDVILLE STORY</span><span className="blog-meta">{post.category} / {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span><h2>{post.title}</h2>{post.excerpt && <p>{post.excerpt}</p>}<div className="blog-story-byline"><span>LANDVILLE / TURN THE PAGE ↓</span><i /></div></header>{post.cover_url && <figure className="blog-story-cover"><Image unoptimized src={post.cover_url} width={1400} height={830} alt={post.cover_alt || ''} />{post.cover_alt && <figcaption>{post.cover_alt}</figcaption>}</figure>}<BlogContent blocks={post.blocks} /><footer className="blog-story-footer"><span>END OF CHAPTER / KEEP BUILDING</span><Link href="/blog">MORE STORIES <ArrowUpRight size={17} /></Link></footer></article></ProductShell>;
}
