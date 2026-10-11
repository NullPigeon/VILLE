import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { database, enforceRate } from '@/lib/server/database';
import { jobId, readJob, type JobRow } from '@/lib/server/agent-jobs';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'private, no-store' };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const job = await readJob(jobId((await params).id));
    if (job.client_wallet !== owner || job.status !== 'completed' || !job.seller_wallet || job.rating !== null) {
      throw new ApiError(409, 'Only the buyer can review a completed citizen job once.');
    }
    const body = await jsonBody(request);
    if (Object.keys(body).length !== 2 || !Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5 ||
      typeof body.review !== 'string' || body.review.trim().length < 10 || body.review.trim().length > 500) {
      throw new ApiError(400, 'Choose 1–5 stars and write a 10–500 character review.');
    }
    await enforceRate(owner, 'agent-job-review', 4);
    const updated = await database<JobRow[]>(`landville_agent_jobs?id=eq.${job.id}&client_wallet=eq.${owner}&status=eq.completed&rating=is.null`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ rating: body.rating, review: body.review.trim(), updated_at: new Date().toISOString() }),
    });
    if (!updated.length) throw new ApiError(409, 'This job was already reviewed.');
    return NextResponse.json({ reviewed: true }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const job = await readJob(jobId((await params).id));
    if (job.client_wallet !== owner || job.status !== 'open') throw new ApiError(409, 'Only the buyer can close an open job.');
    await enforceRate(owner, 'agent-job-close', 4);
    const updated = await database<JobRow[]>(`landville_agent_jobs?id=eq.${job.id}&client_wallet=eq.${owner}&status=eq.open`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }),
    });
    if (!updated.length) throw new ApiError(409, 'Job changed. Refresh and try again.');
    return NextResponse.json({ closed: true }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}
