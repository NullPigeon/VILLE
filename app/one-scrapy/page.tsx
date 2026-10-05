import type { Metadata } from 'next';
import { ProductShell } from '@/components/landville/product-shell';
import { ProjectBannerWall } from '@/components/landville/project-banner-wall';

export const metadata: Metadata = {
  title: 'ONE SCRAPY PAGE — LANDVILLE',
  description: 'A curated wall of projects pinned to LANDVILLE by Scrapy.',
};

export default function OneScrapyPage() {
  return <ProductShell title="ONE SCRAPY PAGE" eyebrow="PROJECT SIGNALS / CURATED BY SCRAPY" immersive>
    <div className="one-scrapy-page">
      <h1 className="one-scrapy-sr-only">One Scrapy Page</h1>
      <ProjectBannerWall />
    </div>
  </ProductShell>;
}
