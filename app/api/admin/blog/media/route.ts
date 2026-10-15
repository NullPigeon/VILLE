import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { requireBuildAdmin } from '@/lib/server/builds';
import { enforceRate } from '@/lib/server/database';

const types: Record<string, { extension: string; max: number }> = {
  'image/jpeg': { extension: 'jpg', max: 8_000_000 },
  'image/png': { extension: 'png', max: 8_000_000 },
  'image/webp': { extension: 'webp', max: 8_000_000 },
  'image/gif': { extension: 'gif', max: 8_000_000 },
  'video/mp4': { extension: 'mp4', max: 50_000_000 },
  'video/webm': { extension: 'webm', max: 50_000_000 },
};

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    await enforceRate(actor, 'blog-media', 20);
    const body = await jsonBody(request);
    const mime = typeof body.type === 'string' ? body.type : '';
    const size = Number(body.size);
    const media = types[mime];
    if (!media || !Number.isInteger(size) || size < 1 || size > media.max) throw new ApiError(400, 'Use a JPG, PNG, WebP, GIF (8 MB max) or MP4/WebM (50 MB max).');
    const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new ApiError(503, 'Media storage is not configured.');
    const root = base.replace(/\/$/, '');
    const path = `dispatch/${randomUUID()}.${media.extension}`;
    const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
    if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
    const response = await fetch(`${root}/storage/v1/object/upload/sign/landville-blog/${path}`, { method: 'POST', headers, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new ApiError(503, 'Media storage is unavailable or the blog migration is missing.');
    const result = await response.json() as { url?: string };
    if (!result.url?.startsWith(`/object/upload/sign/landville-blog/${path}?`)) throw new ApiError(503, 'Media storage returned an invalid upload URL.');
    return NextResponse.json({ signedUrl: `${root}/storage/v1${result.url}`, publicUrl: `${root}/storage/v1/object/public/landville-blog/${path}` }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
