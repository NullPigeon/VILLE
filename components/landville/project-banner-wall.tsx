'use client';
/* oxlint-disable next/no-img-element -- project artwork uses admin-curated arbitrary HTTPS hosts */

import { Fragment, useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
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
  const [activeBanner, setActiveBanner] = useState<ProjectBanner | null>(null);
  const [touchArmed, setTouchArmed] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  function showDetails(banner: ProjectBanner, x: number, y: number) {
    setActiveBanner(banner);
    setTooltipPosition({
      x: Math.max(8, Math.min(x + 14, window.innerWidth - 316)),
      y: Math.max(8, Math.min(y + 14, window.innerHeight - 235)),
    });
  }

  useEffect(() => {
    let current = true;
    fetch('/api/project-banners', { cache: 'no-store' }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The project wall is unavailable.');
      if (current) { setBanners(data.banners); setState('ready'); }
    }).catch(() => { if (current) setState('error'); });
    return () => { current = false; };
  }, []);

  const tileCount = Math.max(1050, banners.length * 30 + 30);

  return <>
    <section className="one-scrapy-grid" aria-label="One Scrapy banner mosaic">
      {Array.from({ length: tileCount }, (_, index) => {
        const banner = index % 30 === 14 ? banners[Math.floor(index / 30)] : undefined;
        const face = index % 71 === 11;
        return <Fragment key={index}>
          {banner && <a
            className="one-scrapy-banner"
            href={banner.twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${banner.name} on X - ${banner.description}`}
            onMouseEnter={(event) => { if (window.matchMedia('(hover: hover)').matches) showDetails(banner, event.clientX, event.clientY); }}
            onMouseLeave={() => { if (window.matchMedia('(hover: hover)').matches) { setActiveBanner(null); setTouchArmed(null); } }}
            onFocus={(event) => { const rect = event.currentTarget.getBoundingClientRect(); showDetails(banner, rect.left, rect.bottom); }}
            onBlur={() => { setActiveBanner(null); setTouchArmed(null); }}
            onClick={(event) => {
              if (window.matchMedia('(hover: none)').matches && touchArmed !== banner.id) {
                event.preventDefault();
                setTouchArmed(banner.id);
                const rect = event.currentTarget.getBoundingClientRect();
                showDetails(banner, rect.left, rect.bottom);
              }
            }}
          >
            <img src={banner.imageUrl} alt={`${banner.name} project banner`} referrerPolicy="no-referrer" onLoad={(event) => {
              const ratio = event.currentTarget.naturalWidth / event.currentTarget.naturalHeight;
              const columns = ratio > 2.3 ? 6 : ratio > 1.3 ? 5 : ratio < .6 ? 2 : 3;
              const rows = ratio > 2.3 ? 2 : ratio > 1.3 ? 3 : ratio < .85 ? 4 : 3;
              event.currentTarget.parentElement?.style.setProperty('--banner-columns', String(columns));
              event.currentTarget.parentElement?.style.setProperty('--banner-rows', String(rows));
            }} />
          </a>}
          <span aria-hidden="true" className={`one-scrapy-tile${face ? ' has-face' : ''}${index % 13 === 0 ? ' tile-rust' : index % 7 === 0 ? ' tile-sand' : ''}`}>
            {face && <ScrapyBot portrait />}
          </span>
        </Fragment>;
      })}
    </section>
    <output className="one-scrapy-sr-only">{state === 'error' ? 'Project banners are unavailable.' : state === 'loading' ? 'Loading project banners.' : banners.length ? `${banners.length} project banners on the wall.` : 'No project banners yet.'}</output>
    {activeBanner && <aside className="one-scrapy-tooltip" role="tooltip" style={{ left: tooltipPosition.x, top: tooltipPosition.y }}>
      <span className="one-scrapy-meta"><b>{xLabel(activeBanner.twitterUrl)}</b><i>{hostLabel(activeBanner.websiteUrl)}</i></span>
      <strong>{activeBanner.name}</strong>
      <span className="one-scrapy-description">{activeBanner.description}</span>
      <span className="one-scrapy-open">OPEN ON X <ArrowUpRight /></span>
    </aside>}
  </>;
}
