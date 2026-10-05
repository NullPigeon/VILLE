import type { Metadata } from 'next';
import { ArrowUpRight, RadioTower } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { ProjectBannerWall } from '@/components/landville/project-banner-wall';
import { ScrapyBot } from '@/components/landville/scrapy-bot';

export const metadata: Metadata = {
  title: 'ONE SCRAPY PAGE — LANDVILLE',
  description: 'A curated wall of projects pinned to LANDVILLE by Scrapy.',
};

const faceTiles = new Set([2, 7, 13, 20, 26, 33]);

export default function OneScrapyPage() {
  return <ProductShell title="ONE SCRAPY PAGE" eyebrow="PROJECT SIGNALS / CURATED BY SCRAPY">
    <div className="one-scrapy-page">
      <section className="one-scrapy-hero" aria-labelledby="one-scrapy-title">
        <div className="one-scrapy-hero-copy">
          <span className="one-scrapy-kicker"><RadioTower /> LIVE FROM THE SCRAPY NETWORK</span>
          <h2 id="one-scrapy-title">GOOD PROJECTS.<br /><em>LOUD SIGNAL.</em></h2>
          <p>Scrapy pins the projects worth a closer look. Pick a banner, meet its makers on X, and see what they are building.</p>
          <span className="one-scrapy-hero-stamp">ONE WALL <i /> MANY WORLDS <ArrowUpRight /></span>
        </div>
        <div className="one-scrapy-mayor-card" aria-hidden="true">
          <span>CURATED BY THE MAYOR / 001</span>
          <ScrapyBot portrait />
          <strong>SCRAPY<br />APPROVED-ish.</strong>
        </div>
      </section>

      <section className="one-scrapy-board" aria-labelledby="one-scrapy-board-title">
        <header className="one-scrapy-board-head">
          <div><span>THE WALL / PROJECT SIGNALS</span><h2 id="one-scrapy-board-title">PINNED IN TOWN.</h2></div>
          <p>Hover for details. Tap once to preview, twice to open on X.</p>
        </header>
        <ProjectBannerWall />
        <div className="one-scrapy-tile-field" aria-hidden="true">
          {Array.from({ length: 36 }, (_, index) => <span key={index} className={faceTiles.has(index) ? 'has-face' : ''}>
            {faceTiles.has(index) && <ScrapyBot portrait />}
          </span>)}
        </div>
      </section>
    </div>
  </ProductShell>;
}
