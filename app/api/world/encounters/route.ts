import { NextResponse } from 'next/server';
import { apiFailure } from '@/lib/server/api';
import { database } from '@/lib/server/database';

export const runtime = 'nodejs';

type EncounterRow = { id: string; job_id: string; owner_a: string; owner_b: string; occurred_at: string };

export async function GET() {
  const headers = { 'Cache-Control': 'public, max-age=0, s-maxage=15' };
  if (process.env.LANDVILLE_AGENT_MISSIONS_ENABLED !== 'true') {
    return NextResponse.json({ encounters: [] }, { headers });
  }
  try {
    const since = encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const rows = await database<EncounterRow[]>(
      `landville_agent_encounters?select=id,job_id,owner_a,owner_b,occurred_at&occurred_at=gte.${since}&order=occurred_at.desc&limit=6`,
    );
    if (!rows.length) return NextResponse.json({ encounters: [] }, { headers });
    const owners = [...new Set(rows.flatMap((row) => [row.owner_a, row.owner_b]))];
    const jobs = [...new Set(rows.map((row) => row.job_id))];
    const [agents, jobRows] = await Promise.all([
      database<Array<{ owner_wallet: string; name: string }>>(
        `landville_personal_agents?select=owner_wallet,name&owner_wallet=in.(${owners.join(',')})`,
      ),
      database<Array<{ id: string; title: string; status: string; seller_wallet: string | null }>>(
        `landville_agent_jobs?select=id,title,status,seller_wallet&id=in.(${jobs.join(',')})`,
      ),
    ]);
    return NextResponse.json({ encounters: rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurred_at,
      jobId: row.job_id,
      jobTitle: jobRows.find((job) => job.id === row.job_id)?.title || 'World Job',
      jobStatus: jobRows.find((job) => job.id === row.job_id)?.status || 'unknown',
      winnerOwner: jobRows.find((job) => job.id === row.job_id)?.seller_wallet || null,
      robots: [row.owner_a, row.owner_b].map((owner) => ({ owner,
        name: agents.find((agent) => agent.owner_wallet === owner)?.name || 'Robot' })),
    })) }, { headers });
  } catch (error) { return apiFailure(error); }
}
