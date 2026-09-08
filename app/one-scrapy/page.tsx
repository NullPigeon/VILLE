import type { Metadata } from 'next';
import { ProductShell } from '@/components/landville/product-shell';
import { ProjectBannerWall } from '@/components/landville/project-banner-wall';

export const metadata: Metadata = {
  title: 'ONE SCRAPY PAGE — LANDVILLE',
  description: 'A curated wall of projects pinned to LANDVILLE by Scrapy.',
};

export default function OneScrapyPage() {
  return <ProductShell title="ONE SCRAPY PAGE" eyebrow="PROJECT SIGNALS / CURATED BY SCRAPY">
    <section className="one-scrapy-intro">
      <div><span>01</span><strong>TWO SIGNALS PER ROW</strong></div>
      <p>A permanent wall for projects worth noticing. Hover for the field notes. Click any banner to meet the project on X.</p>
      <small>RECOMMENDED BANNER / 1200×400 / ANY SIZE ACCEPTED</small>
    </section>
    <ProjectBannerWall />
  </ProductShell>;
}
