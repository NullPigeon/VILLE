'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Search } from 'lucide-react';

type Entry = {
  slug: string;
  title: string;
  summary: string;
  group: string;
  searchText: string;
};

export function GuideNavigation({ entries }: { entries: Entry[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = entries.filter((entry) =>
    terms.every((term) => entry.searchText.includes(term)),
  );
  const groups = [...new Set(filtered.map((entry) => entry.group))];

  return (
    <div className="fg-navigation">
      <label className="fg-search">
        <Search size={17} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the guide…"
          aria-label="Search the Field Guide"
        />
      </label>
      <nav aria-label="Field Guide chapters">
        <Link
          className="fg-nav-home"
          href="/docs"
          onClick={(event) =>
            event.currentTarget.closest('details')?.removeAttribute('open')
          }
          aria-current={pathname === '/docs' ? 'page' : undefined}
        >
          <BookOpen size={16} /> Guide overview
        </Link>
        {groups.map((group) => (
          <div className="fg-nav-group" key={group}>
            <p>{group}</p>
            {filtered
              .filter((entry) => entry.group === group)
              .map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/docs/${entry.slug}`}
                  onClick={(event) =>
                    event.currentTarget
                      .closest('details')
                      ?.removeAttribute('open')
                  }
                  aria-current={
                    pathname === `/docs/${entry.slug}` ? 'page' : undefined
                  }
                >
                  {entry.title}
                </Link>
              ))}
          </div>
        ))}
      </nav>
      {!filtered.length && (
        <output className="fg-search-empty">
          No chapters match “{query}”. Try wallet, likes, rewards or builder.
        </output>
      )}
      <Link className="fg-return" href="/">
        ← Back to the city map
      </Link>
    </div>
  );
}
