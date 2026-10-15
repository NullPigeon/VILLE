import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { database, enforceRate } from '@/lib/server/database';
import { adminPost, blogJsonBody, blogPostId, validateBlogPost } from '@/lib/server/blog';
import type { BlogPost } from '@/lib/blog';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBuildAdmin(request);
    const { id } = await params;
    return NextResponse.json({ post: await adminPost(id) }, { headers });
  } catch (error) { return apiFailure(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    await enforceRate(actor, 'blog-write', 30);
    const { id } = await params;
    const before = await adminPost(id);
    const input = validateBlogPost(await blogJsonBody(request));
    const rows = await database<BlogPost[]>(`landville_blog_posts?id=eq.${blogPostId(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...input, published_at: input.status === 'PUBLISHED' ? before.published_at || new Date().toISOString() : null, updated_at: new Date().toISOString() }) });
    return NextResponse.json({ post: rows[0] }, { headers });
  } catch (error) { return apiFailure(error); }
}
