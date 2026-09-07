'use client';
/* oxlint-disable next/no-img-element -- project artwork uses admin-curated arbitrary HTTPS hosts */

import { useEffect, useState } from 'react';
import { ArrowUpRight, PanelsTopLeft } from 'lucide-react';
import type { ProjectBanner } from '@/lib/project-banner';

function hostLabel(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return value; }
}

function xLabel(value: string) {
  try { return `@${new URL(value).pathname.split('/').filter(Boolean)[0] || 'project'}`; } catch { return '@project'; }
}

export function ProjectBannerWall() {
  const [banners, setBanners] = useState<ProjectBanner[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let current = true;
    fetch('/api/project-banners', { cache: 'no-store' }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The project wall is unavailable.');
      if (current) { setBanners(data.banners); setState('ready'); }
    }).catch(() => { if (current) setState('error'); });
    return () => { current = false; };
  }, []);

  if (state === 'loading') return <div className="one-scrapy-empty"><PanelsTopLeft /><p>SCRAPY IS CHECKING THE WALL…</p></div>;
  if (state === 'error') return <div className="one-scrapy-empty error"><PanelsTopLeft /><p>THE WALL JAMMED. TRY AGAIN SHORTLY.</p></div>;
  if (!banners.length) return <div className="one-scrapy-empty"><PanelsTopLeft /><p>THE WALL IS CLEAN. SUSPICIOUSLY CLEAN.</p><small>PROJECT SIGNALS WILL APPEAR HERE.</small></div>;

  return <section className="one-scrapy-grid" aria-label="Curated project banners">
    {banners.map((banner) => <a key={banner.id} className="one-scrapy-banner" href={banner.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label={`${banner.name} on X — ${banner.description}`}>
      <img src={banner.imageUrl} alt={`${banner.name} project banner`} referrerPolicy="no-referrer" />
      <span className="one-scrapy-overlay">
        <span className="one-scrapy-meta"><b>{xLabel(banner.twitterUrl)}</b><i>{hostLabel(banner.websiteUrl)}</i></span>
        <strong>{banner.name}</strong>
        <span className="one-scrapy-description">{banner.description}</span>
        <span className="one-scrapy-open">OPEN ON X <ArrowUpRight /></span>
      </span>
    </a>)}
  </section>;
}
