import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { database, enforceRate } from '@/lib/server/database';
import { blogJsonBody, listAdminPosts, validateBlogPost } from '@/lib/server/blog';
import type { BlogPost } from '@/lib/blog';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    await requireBuildAdmin(request);
    return NextResponse.json({ posts: await listAdminPosts() }, { headers });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    await enforceRate(actor, 'blog-write', 30);
    const input = validateBlogPost(await blogJsonBody(request));
    const rows = await database<BlogPost[]>('landville_blog_posts', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...input, author_wallet: actor, published_at: input.status === 'PUBLISHED' ? new Date().toISOString() : null }) });
    return NextResponse.json({ post: rows[0] }, { status: 201, headers });
  } catch (error) { return apiFailure(error); }
}
