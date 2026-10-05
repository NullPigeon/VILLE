import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Map, Wrench } from 'lucide-react';
import { guideArticles, GUIDE_NAME, GUIDE_REVIEWED } from '@/lib/field-guide';

export const metadata: Metadata = {
  title: `${GUIDE_NAME} — LANDVILLE documentation`,
  description:
    'Learn every LANDVILLE page, SCRAPY token benefits, voting, weekly likes, the Treasury development status and how the AI builder works.',
  alternates: { canonical: '/docs' },
};

export default function DocsPage() {
  const groups = [...new Set(guideArticles.map((article) => article.group))];
  return (
    <>
      <div className="fg-overview-hero">
        <span className="fg-kicker">A CITIZEN’S MANUAL / EDITION 01</span>
        <h1>
          SCRAPY
          <br />
          <em>FIELD GUIDE.</em>
        </h1>
        <p>
          Everything you need to find your place in LANDVILLE, build with Scrapy
          and understand how the town works.
        </p>
        <small>Plain-language documentation · Reviewed {GUIDE_REVIEWED}</small>
      </div>
      <div className="fg-starter-grid">
        {[
          {
            href: 'getting-started',
            title: 'New in town?',
            description: 'Your first visit, account and idea.',
            icon: Map,
          },
          {
            href: 'scrapy-token',
            title: 'Holding SCRAPY?',
            description: 'Voting power, likes and rewards.',
            icon: BookOpen,
          },
          {
            href: 'builder',
            title: 'How is it built?',
            description: 'From chat to API, GitHub and World.',
            icon: Wrench,
          },
        ].map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={`/docs/${href}`}>
            <Icon />
            <h2>{title}</h2>
            <p>{description}</p>
            <ArrowUpRight />
          </Link>
        ))}
      </div>
      <aside className="fg-note">
        <strong>Know what is available.</strong>
        <p>
          Chapters describe the implemented platform. Features that still need
          operator activation are labelled. The roadmap contains proposed
          directions, not release promises.
        </p>
      </aside>
      {groups.map((group) => (
        <section key={group} className="fg-chapter-group">
          <h2>{group}</h2>
          <div>
            {guideArticles
              .filter((article) => article.group === group)
              .map((article) => (
                <Link key={article.slug} href={`/docs/${article.slug}`}>
                  <div>
                    <h3>{article.title}</h3>
                    <p>{article.summary}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
