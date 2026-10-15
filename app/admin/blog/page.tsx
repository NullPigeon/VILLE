'use client';
/* oxlint-disable react/react-compiler -- remote admin list hydration follows the existing protected admin pattern */
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Bold, Eye, ImagePlus, Italic, Link2, List, Plus, Save, Trash2, Video } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { BlogContent } from '@/components/landville/blog-content';
import { useLandville } from '@/components/landville/provider';
import { BLOG_BLOCK_TYPES, blogSlug, newBlogBlock, safeBlogImage, type BlogBlock, type BlogPost } from '@/lib/blog';
import '../../blog/blog.css';
import './editor.css';

type Draft = { id: string | null; title: string; slug: string; excerpt: string; category: string; coverUrl: string; coverAlt: string; blocks: BlogBlock[]; status: 'DRAFT' | 'PUBLISHED' };
const blank = (): Draft => ({ id: null, title: '', slug: '', excerpt: '', category: 'CITY NEWS', coverUrl: '', coverAlt: '', blocks: [newBlogBlock()], status: 'DRAFT' });
const fromPost = (post: BlogPost): Draft => ({ id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt, category: post.category, coverUrl: post.cover_url || '', coverAlt: post.cover_alt, blocks: post.blocks, status: post.status });

function PanelEditor({ block, busy, patch, upload }: { block: BlogBlock; busy: boolean; patch: (values: Partial<BlogBlock>) => void; upload: (file: File) => void }) {
  return <div className="blog-panel-fields">
    <p>Build a comic frame with your own art, a scene label, narration and an optional character line. Half frames can sit side by side.</p>
    <label>FRAME SIZE<select value={block.layout || 'wide'} onChange={(event) => patch({ layout: event.target.value as 'wide' | 'half' })}><option value="wide">Wide / full row</option><option value="half">Half / pair with next frame</option></select></label>
    <div className="blog-media-actions"><label className="blog-upload"><ImagePlus size={16} /> UPLOAD FRAME ART<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ''; }} /></label><input value={block.url || ''} placeholder="or paste an HTTPS image URL" onChange={(event) => patch({ url: event.target.value })} /></div>
    <input value={block.caption || ''} maxLength={240} placeholder="Scene label / image description" onChange={(event) => patch({ caption: event.target.value })} />
    <textarea value={block.text} maxLength={12000} rows={3} placeholder="Narration printed over this frame…" onChange={(event) => patch({ text: event.target.value })} />
    <div className="blog-panel-dialogue"><input value={block.speaker || ''} maxLength={60} placeholder="Character name (optional)" onChange={(event) => patch({ speaker: event.target.value })} /><input value={block.speech || ''} maxLength={280} placeholder="Speech bubble (optional)" onChange={(event) => patch({ speech: event.target.value })} /></div>
  </div>;
}

export default function BlogAdminPage() {
  const { isAdmin, status } = useLandville();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(true);
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/blog/posts', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load posts.');
    setPosts(data.posts);
  }, []);
  useEffect(() => { if (!isAdmin) return; void load().catch((error: Error) => setNotice(error.message)); }, [isAdmin, load]);
  function switchDraft(next: Draft) {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setDraft(next); setSlugTouched(Boolean(next.id)); setDirty(false); setNotice('');
  }
  function patch(values: Partial<Draft>) { setDraft((current) => current && { ...current, ...values }); setDirty(true); }
  function patchBlock(id: string, values: Partial<BlogBlock>) { setDraft((current) => current && { ...current, blocks: current.blocks.map((block) => block.id === id ? { ...block, ...values } : block) }); setDirty(true); }
  function moveBlock(index: number, direction: -1 | 1) {
    if (!draft || index + direction < 0 || index + direction >= draft.blocks.length) return;
    const blocks = [...draft.blocks]; [blocks[index], blocks[index + direction]] = [blocks[index + direction], blocks[index]]; patch({ blocks });
  }
  function wrapSelection(id: string, marker: '*' | '**' | 'link') {
    const element = document.querySelector<HTMLTextAreaElement>(`textarea[data-blog-block="${id}"]`);
    if (!element) return;
    const block = draft?.blocks.find((item) => item.id === id);
    if (!block) return;
    const start = element.selectionStart; const end = element.selectionEnd;
    const selected = block.text.slice(start, end) || (marker === 'link' ? 'link text' : 'text');
    const replacement = marker === 'link' ? `[${selected}](https://example.com)` : `${marker}${selected}${marker}`;
    patchBlock(id, { text: block.text.slice(0, start) + replacement + block.text.slice(end) });
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + replacement.length, start + replacement.length); });
  }
  async function upload(file: File, target: string) {
    if (!file) return;
    setBusy(true); setNotice(`Uploading ${file.name}…`);
    try {
      const response = await fetch('/api/admin/blog/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: file.type, size: file.size }) });
      const signed = await response.json();
      if (!response.ok) throw new Error(signed.error || 'Could not prepare upload.');
      const form = new FormData(); form.append('cacheControl', '3600'); form.append('', file);
      const uploaded = await fetch(signed.signedUrl, { method: 'PUT', body: form });
      if (!uploaded.ok) throw new Error('Upload failed. Try a smaller file or paste an external video URL.');
      if (target === 'cover') patch({ coverUrl: signed.publicUrl, coverAlt: draft?.coverAlt || file.name.replace(/\.[^.]+$/, '') });
      else patchBlock(target, { url: signed.publicUrl, text: draft?.blocks.find((block) => block.id === target)?.text || file.name.replace(/\.[^.]+$/, '') });
      setNotice('Upload complete. Save the post to keep this media.');
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  async function save(nextStatus: Draft['status']) {
    if (!draft || busy) return;
    setBusy(true); setNotice('');
    try {
      const url = draft.id ? `/api/admin/blog/posts/${draft.id}` : '/api/admin/blog/posts';
      const response = await fetch(url, { method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, status: nextStatus }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the post.');
      setDraft(fromPost(result.post)); setSlugTouched(true); setDirty(false);
      await load();
      setNotice(nextStatus === 'PUBLISHED' ? 'Published. The story is live in The Dispatch.' : draft.status === 'PUBLISHED' ? 'Unpublished. The story is now a draft.' : 'Draft saved.');
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  return <ProductShell title="DISPATCH EDITOR" eyebrow="ADMIN / STORIES / CITY NEWS" actions={<Link className="lv-button" href="/blog">VIEW PUBLIC BLOG <ArrowUpRight size={16} /></Link>}>
    {!isAdmin ? <section className="lv-panel chat-sidebar-body"><h2>ADMIN ACCESS REQUIRED</h2><p>{status === 'loading' ? 'Checking access…' : 'Sign in with an authorized operator wallet.'}</p><Link className="lv-button" href="/citizens">MY PROFILE / SIGN IN</Link></section> : <div className="blog-admin">
      <aside className="blog-admin-list"><div className="blog-admin-list-head"><span>EDITORIAL DESK</span><button onClick={() => switchDraft(blank())}><Plus size={16} /> NEW STORY</button></div><p>{posts.length} {posts.length === 1 ? 'post' : 'posts'} · drafts stay private</p>{posts.map((post) => <button key={post.id} className={draft?.id === post.id ? 'selected' : ''} onClick={() => switchDraft(fromPost(post))}><small>{post.status} / {post.category}</small><strong>{post.title}</strong><span>{new Date(post.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></button>)}{posts.length === 0 && <div className="blog-admin-empty">No stories yet. Open a new page and start the city’s first dispatch.</div>}</aside>
      <div className="blog-editor-area">{!draft ? <div className="blog-editor-welcome"><span>LANDVILLE / DISPATCH DESK</span><h2>Every city needs<br /><em>a record.</em></h2><p>Write release notes, stories and field reports. Nothing goes live until you press Publish.</p><button onClick={() => switchDraft(blank())}><Plus size={19} /> WRITE THE FIRST STORY</button></div> : <>
        <div className="blog-editor-top"><Link href="/admin"><ArrowLeft size={16} /> BUILD CONTROL</Link><span>{draft.id ? draft.status : 'NEW DRAFT'}{dirty && ' · UNSAVED'}</span><button onClick={() => setPreview(!preview)}><Eye size={16} /> {preview ? 'HIDE PREVIEW' : 'SHOW PREVIEW'}</button></div>
        <div className="blog-editor-actions"><button disabled={busy} onClick={() => void save('DRAFT')}><Save size={17} /> SAVE DRAFT</button><button className="primary" disabled={busy} onClick={() => void save('PUBLISHED')}>{draft.status === 'PUBLISHED' ? 'UPDATE LIVE POST' : 'PUBLISH STORY'} <ArrowUpRight size={17} /></button>{draft.status === 'PUBLISHED' && <button disabled={busy} onClick={() => void save('DRAFT')}>UNPUBLISH</button>}{draft.id && draft.status === 'PUBLISHED' && <Link href={`/blog/${draft.slug}`} target="_blank">OPEN LIVE STORY ↗</Link>}</div>
        {notice && <output className="blog-editor-notice">{notice}</output>}
        <div className={preview ? 'blog-editor-columns' : 'blog-editor-columns no-preview'}><div className="blog-editor-form"><label className="blog-field"><span>01 / HEADLINE</span><input value={draft.title} maxLength={160} placeholder="Give this story a headline" onChange={(event) => patch({ title: event.target.value, ...(!slugTouched ? { slug: blogSlug(event.target.value) } : {}) })} /></label><div className="blog-editor-row"><label className="blog-field"><span>URL SLUG</span><input value={draft.slug} maxLength={100} placeholder="my-city-update" onChange={(event) => { setSlugTouched(true); patch({ slug: blogSlug(event.target.value) }); }} /></label><label className="blog-field"><span>CATEGORY</span><input value={draft.category} maxLength={40} placeholder="CITY NEWS" onChange={(event) => patch({ category: event.target.value })} /></label></div><label className="blog-field"><span>SHORT INTRO / SOCIAL DESCRIPTION</span><textarea value={draft.excerpt} maxLength={320} rows={3} placeholder="A line that makes people open the story…" onChange={(event) => patch({ excerpt: event.target.value })} /></label>
          <div className="blog-cover-editor"><div><span>02 / COVER ART</span><small>Wide image recommended · JPG, PNG, WebP or GIF · 8 MB max</small></div>{safeBlogImage(draft.coverUrl) && <Image unoptimized src={draft.coverUrl} width={900} height={520} alt={draft.coverAlt || ''} />}<div className="blog-media-actions"><label className="blog-upload"><ImagePlus size={16} /> UPLOAD IMAGE<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, 'cover'); event.target.value = ''; }} /></label><input value={draft.coverUrl} placeholder="or paste an HTTPS image URL" onChange={(event) => patch({ coverUrl: event.target.value })} /></div><input value={draft.coverAlt} maxLength={180} placeholder="Describe the image for accessibility" onChange={(event) => patch({ coverAlt: event.target.value })} /></div>
          <div className="blog-blocks-head"><span>03 / STORY BODY</span><small>Choose blocks, write, rearrange, preview.</small></div><div className="blog-blocks">{draft.blocks.map((block, index) => <div className="blog-block-editor" key={block.id}><div className="blog-block-bar"><select aria-label="Block type" value={block.type} onChange={(event) => patchBlock(block.id, { type: event.target.value as BlogBlock['type'], text: '', url: '', caption: '' })}>{BLOG_BLOCK_TYPES.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select><div><button aria-label="Move block up" title="Move up" disabled={index === 0} onClick={() => moveBlock(index, -1)}><ArrowUp size={15} /></button><button aria-label="Move block down" title="Move down" disabled={index === draft.blocks.length - 1} onClick={() => moveBlock(index, 1)}><ArrowDown size={15} /></button><button aria-label="Remove block" title="Remove block" onClick={() => patch({ blocks: draft.blocks.filter((item) => item.id !== block.id) })}><Trash2 size={15} /></button></div></div>{['paragraph','heading','subheading','quote','list'].includes(block.type) && <><div className="blog-inline-toolbar"><button title="Bold selected text" onClick={() => wrapSelection(block.id, '**')}><Bold size={15} /></button><button title="Italic selected text" onClick={() => wrapSelection(block.id, '*')}><Italic size={15} /></button><button title="Add link to selected text" onClick={() => wrapSelection(block.id, 'link')}><Link2 size={15} /></button>{block.type === 'list' && <span><List size={15} /> ONE ITEM PER LINE</span>}</div><textarea data-blog-block={block.id} rows={block.type === 'paragraph' ? 5 : 3} value={block.text} maxLength={12000} placeholder={block.type === 'list' ? 'First item\nSecond item' : block.type === 'quote' ? 'A line worth remembering…' : 'Write here…'} onChange={(event) => patchBlock(block.id, { text: event.target.value })} /></>}{block.type === 'image' && <><div className="blog-media-actions"><label className="blog-upload"><ImagePlus size={16} /> UPLOAD IMAGE<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, block.id); event.target.value = ''; }} /></label><input value={block.url || ''} placeholder="or paste an HTTPS image URL" onChange={(event) => patchBlock(block.id, { url: event.target.value })} /></div><input value={block.text} maxLength={180} placeholder="Image description (alt text)" onChange={(event) => patchBlock(block.id, { text: event.target.value })} /><input value={block.caption || ''} maxLength={240} placeholder="Caption (optional)" onChange={(event) => patchBlock(block.id, { caption: event.target.value })} /></>}{block.type === 'video' && <><div className="blog-media-actions"><label className="blog-upload"><Video size={16} /> UPLOAD VIDEO<input type="file" accept="video/mp4,video/webm" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, block.id); event.target.value = ''; }} /></label><input value={block.url || ''} placeholder="or paste MP4, WebM, YouTube or Vimeo URL" onChange={(event) => patchBlock(block.id, { url: event.target.value })} /></div><input value={block.text} maxLength={180} placeholder="Video title for accessibility" onChange={(event) => patchBlock(block.id, { text: event.target.value })} /><input value={block.caption || ''} maxLength={240} placeholder="Caption (optional)" onChange={(event) => patchBlock(block.id, { caption: event.target.value })} /></>}{block.type === 'panel' && <PanelEditor block={block} busy={busy} patch={(values) => patchBlock(block.id, values)} upload={(file) => void upload(file, block.id)} />}{block.type === 'divider' && <p className="blog-divider-note">SECTION BREAK</p>}</div>)}</div><div className="blog-add-block">{BLOG_BLOCK_TYPES.map((item) => <button key={item.type} onClick={() => patch({ blocks: [...draft.blocks, newBlogBlock(item.type)] })}><Plus size={13} /> {item.label}</button>)}</div></div>
          {preview && <aside className="blog-preview"><span className="blog-preview-label">LIVE PREVIEW / HOW IT WILL READ</span>{safeBlogImage(draft.coverUrl) && <Image unoptimized className="blog-preview-cover" src={draft.coverUrl} width={700} height={420} alt={draft.coverAlt || ''} />}<small>{draft.category || 'CITY NEWS'} / LANDVILLE DISPATCH</small><h2>{draft.title || 'Your headline goes here'}</h2>{draft.excerpt && <p className="blog-preview-excerpt">{draft.excerpt}</p>}<BlogContent blocks={draft.blocks} /></aside>}
        </div>
      </>}</div>
    </div>}
  </ProductShell>;
}
