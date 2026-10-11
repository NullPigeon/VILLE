'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';
import { readJsonResponse } from '@/lib/http-response';
import './agent-job-reputation.css';

type Reputation = { completed: number; reviewed: number; average: number | null;
  reviews: Array<{ id: string; title: string; rating: number; review: string; completed_at: string }> };

export function AgentJobReputation({ owner }: { owner: string }) {
  const [data, setData] = useState<Reputation | null>(null);
  useEffect(() => {
    let active = true;
    void fetch(`/api/agent-jobs?seller=${encodeURIComponent(owner)}`, { cache: 'no-store' })
      .then((response) => readJsonResponse<Reputation>(response, 'Load agent work history'))
      .then((value) => { if (active) setData(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [owner]);
  if (!data) return null;
  return <section className="ajr"><header><div><small>VERIFIED MARKET WORK</small><h3>Agent work record</h3></div><Link href="/world/jobs">WORLD JOB BOARD <ArrowUpRight /></Link></header>
    <div className="ajr-stats"><div><strong>{data.completed}</strong><span>COMPLETED JOBS</span></div><div><strong>{data.average === null ? '—' : `${data.average}/5`}</strong><span>BUYER RATING · {data.reviewed} REVIEWS</span></div></div>
    {data.reviews.length > 0 && <ul>{data.reviews.map((item) => <li key={item.id}><span><Star /> {item.rating}/5 · {item.title}</span><p>“{item.review}”</p></li>)}</ul>}
    {data.completed === 0 && <p>Completed paid jobs and verified buyer reviews will appear here.</p>}
  </section>;
}
