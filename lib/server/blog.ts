import 'server-only';
import { ApiError } from '@/lib/server/api';
import { blogSlug, blogVideo, safeBlogImage, type BlogBlock, type BlogPost } from '@/lib/blog';
import { database, databaseConfigured } from '@/lib/server/database';

const BLOG_SELECT = 'id,slug,title,excerpt,category,cover_url,cover_alt,blocks,status,author_wallet,created_at,updated_at,published_at';

export function blogPostId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)) throw new ApiError(400, 'Invalid post ID.');
  return value.toLowerCase();
}

export function validateBlogPost(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const slug = typeof body.slug === 'string' ? blogSlug(body.slug) : '';
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim().toUpperCase() : '';
  const coverUrl = typeof body.coverUrl === 'string' ? body.coverUrl.trim() : '';
  const coverAlt = typeof body.coverAlt === 'string' ? body.coverAlt.trim() : '';
  const status = body.status;
  if (title.length < 5 || title.length > 160) throw new ApiError(400, 'Title must be 5–160 characters.');
  if (slug.length < 3 || slug.length > 100) throw new ApiError(400, 'Use a URL slug of 3–100 characters.');
  if (excerpt.length > 320) throw new ApiError(400, 'Excerpt is too long.');
  if (category.length < 2 || category.length > 40) throw new ApiError(400, 'Category must be 2–40 characters.');
  if (coverUrl && (coverUrl.length > 2048 || !safeBlogImage(coverUrl))) throw new ApiError(400, 'Use a valid HTTPS cover image.');
  if (coverAlt.length > 180) throw new ApiError(400, 'Cover description is too long.');
  if (status !== 'DRAFT' && status !== 'PUBLISHED') throw new ApiError(400, 'Choose draft or published.');
  if (!Array.isArray(body.blocks) || body.blocks.length > 80) throw new ApiError(400, 'A post can have up to 80 content blocks.');
  const types = new Set<BlogBlock['type']>(['paragraph','heading','subheading','quote','list','image','video','panel','divider']);
  const blocks = body.blocks.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ApiError(400, 'Invalid content block.');
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== 'string' || !/^[0-9a-z-]{8,48}$/i.test(item.id) || !types.has(item.type as BlogBlock['type'])) throw new ApiError(400, 'Invalid content block.');
    const type = item.type as BlogBlock['type'];
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    const caption = typeof item.caption === 'string' ? item.caption.trim() : '';
    const speaker = typeof item.speaker === 'string' ? item.speaker.trim() : '';
    const speech = typeof item.speech === 'string' ? item.speech.trim() : '';
    const layout = item.layout === 'half' ? 'half' : 'wide';
    if (text.length > 12000 || caption.length > 240 || url.length > 2048 || speaker.length > 60 || speech.length > 280) throw new ApiError(400, 'A content block is too long.');
    if ((type === 'image' || type === 'panel') && url && !safeBlogImage(url)) throw new ApiError(400, 'Invalid image URL.');
    if (type === 'video' && url && !blogVideo(url)) throw new ApiError(400, 'Use an HTTPS MP4/WebM, YouTube or Vimeo video.');
    return { id: item.id, type, text, ...(url ? { url } : {}), ...(caption ? { caption } : {}), ...(type === 'panel' ? { speaker, speech, layout } : {}) } satisfies BlogBlock;
  });
  if (status === 'PUBLISHED' && !blocks.some((block) => block.type === 'image' || block.type === 'video' || block.type === 'panel' ? Boolean(block.url) : Boolean(block.text))) throw new ApiError(400, 'Add content before publishing.');
  if (status === 'PUBLISHED' && blocks.some((block) => block.type === 'panel' && !block.url)) throw new ApiError(400, 'Add art to every comic panel before publishing.');
  return { title, slug, excerpt, category, cover_url: coverUrl || null, cover_alt: coverAlt, blocks, status };
}

export function listPublishedPosts(limit = 60) {
  if (!databaseConfigured()) return Promise.resolve([] as BlogPost[]);
  return database<BlogPost[]>(`landville_blog_posts?select=${BLOG_SELECT}&status=eq.PUBLISHED&order=published_at.desc,id.desc&limit=${limit}`);
}

export async function publishedPost(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return null;
  const rows = await database<BlogPost[]>(`landville_blog_posts?select=${BLOG_SELECT}&slug=eq.${slug}&status=eq.PUBLISHED&limit=1`);
  return rows[0] || null;
}

export function listAdminPosts() {
  return database<BlogPost[]>(`landville_blog_posts?select=${BLOG_SELECT}&order=updated_at.desc&limit=200`);
}

export async function adminPost(id: string) {
  const rows = await database<BlogPost[]>(`landville_blog_posts?select=${BLOG_SELECT}&id=eq.${blogPostId(id)}&limit=1`);
  if (!rows[0]) throw new ApiError(404, 'Post not found.');
  return rows[0];
}

export async function blogJsonBody(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 160_000) throw new ApiError(413, 'Post is too large.');
  const text = await request.text();
  if (text.length > 160_000) throw new ApiError(413, 'Post is too large.');
  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new ApiError(400, 'Invalid post data.'); }
}
