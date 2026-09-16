import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { GuideNavigation } from '@/components/landville/guide-navigation';
import { guideArticles, GUIDE_NAME } from '@/lib/field-guide';
import './guide.css';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const entries = guideArticles.map(
    ({ slug, title, summary, group, sections }) => ({
      slug,
      title,
      summary,
      group,
      searchText:
        `${title} ${summary} ${JSON.stringify(sections)}`.toLowerCase(),
    }),
  );
  const navigation = <GuideNavigation entries={entries} />;
  return (
    <div className="fg-root">
      <a className="fg-skip" href="#guide-content">
        Skip to content
      </a>
      <header className="fg-header">
        <Link href="/" className="fg-brand">
          LANDVILLE<span> / </span>
          <small>THE TOWN MANUAL</small>
        </Link>
        <nav aria-label="Guide quick links">
          <Link href="/docs">
            <BookOpen size={16} />
            <span>FIELD GUIDE</span>
          </Link>
          <Link href="/world">
            ENTER WORLD <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <div className="fg-mobile-navigation">
        <details>
          <summary>Browse {GUIDE_NAME}</summary>
          {navigation}
        </details>
      </div>
      <div className="fg-layout">
        <aside className="fg-sidebar">
          <Link href="/docs" className="fg-guide-label">
            SCRAPY
            <br />
            <strong>FIELD GUIDE.</strong>
            <span>HOW THIS TOWN WORKS</span>
          </Link>
          {navigation}
        </aside>
        <main id="guide-content" className="fg-main" tabIndex={-1}>
          {children}
        </main>
      </div>
      <footer className="fg-footer">
        <span>LANDVILLE / {GUIDE_NAME}</span>
        <Link href="/docs/links">All links & shareable descriptions ↗</Link>
        <a
          href="https://github.com/NullPigeon/VILLE"
          target="_blank"
          rel="noreferrer"
        >
          Source on GitHub ↗
        </a>
      </footer>
    </div>
  );
}
