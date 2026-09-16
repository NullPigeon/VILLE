import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { CopyText } from '@/components/landville/copy-text';
import {
  findGuide,
  guideArticles,
  GUIDE_NAME,
  GUIDE_REVIEWED,
  townDestinations,
} from '@/lib/field-guide';
import { SCRAPY_TOKEN } from '@/lib/scrapy-token';

export function generateStaticParams() {
  return guideArticles.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = findGuide(slug);
  if (!article) return { title: 'Guide not found — LANDVILLE' };
  return {
    title: `${article.title} — ${GUIDE_NAME}`,
    description: article.summary,
    alternates: { canonical: `/docs/${slug}` },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = findGuide(slug);
  if (!article) notFound();
  const index = guideArticles.findIndex((entry) => entry.slug === slug);
  const previous = guideArticles[index - 1];
  const next = guideArticles[index + 1];
  return (
    <>
      <nav className="fg-breadcrumb" aria-label="Breadcrumb">
        <Link href="/docs">Field Guide</Link>
        <span>/</span>
        <span>{article.group}</span>
      </nav>
      <header className="fg-article-header">
        <span className="fg-kicker">
          {String(index + 1).padStart(2, '0')} / {article.group}
        </span>
        <h1>{article.title}</h1>
        <p>{article.summary}</p>
        <small>Reviewed {GUIDE_REVIEWED}</small>
        {article.destination && (
          <Link className="fg-destination" href={article.destination}>
            OPEN THIS PAGE <ArrowUpRight size={16} />
          </Link>
        )}
      </header>
      <nav className="fg-toc" aria-label="On this page">
        <strong>ON THIS PAGE</strong>
        {article.sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>
      <article className="fg-article">
        {article.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>
              <a href={`#${section.id}`}>
                {section.title}
                <span aria-hidden="true"> #</span>
              </a>
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items && (
              <ol>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            )}
            {section.table && (
              <section
                className="fg-table-wrap"
                // Keyboard users need to scroll wide tables on small screens.
                // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                tabIndex={0}
                aria-label={section.title}
              >
                <table>
                  <thead>
                    <tr>
                      {section.table.headings.map((heading) => (
                        <th key={heading} scope="col">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, cellIndex) =>
                          cellIndex === 0 ? (
                            <th key={cellIndex} scope="row">
                              {cell}
                            </th>
                          ) : (
                            <td key={cellIndex}>{cell}</td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </section>
        ))}
      </article>
      {slug === 'scrapy-token' && (
        <aside className="fg-note">
          <strong>OFFICIAL SCRAPY CONTRACT / ROBINHOOD MAINNET</strong>
          <p className="fg-address">{SCRAPY_TOKEN.address}</p>
          <CopyText text={SCRAPY_TOKEN.address} label="Copy token address" />
          <a
            href={`https://robinhoodchain.blockscout.com/address/${SCRAPY_TOKEN.address}`}
            target="_blank"
            rel="noreferrer"
          >
            Inspect token in explorer ↗
          </a>
        </aside>
      )}
      {slug === 'transactions' && (
        <aside className="fg-note">
          <strong>DEPLOYED FEE ROUTER</strong>
          <p className="fg-address">
            0x92a9a8308eD793D59c2653773F296F73BA9085B3
          </p>
          <a
            href="https://robinhoodchain.blockscout.com/address/0x92a9a8308eD793D59c2653773F296F73BA9085B3"
            target="_blank"
            rel="noreferrer"
          >
            Inspect in Robinhood Explorer ↗
          </a>
        </aside>
      )}
      {slug === 'links' && (
        <section
          className="fg-share-cards"
          aria-label="Copy-ready page descriptions"
        >
          {[
            {
              title: 'LANDVILLE',
              href: '/',
              description:
                'A digital town built by its citizens with Scrapy, an AI mayor and module builder. Explore the map and choose where to start.',
            },
            ...townDestinations,
            {
              title: 'Private archive',
              href: '/chat/archive',
              description:
                'Read your old private Workshop conversations after signing in. New discussions happen in public Town Chat.',
            },
          ].map((destination) => {
            const url = `https://landville.xyz${destination.href === '/' ? '' : destination.href}`;
            const text = `${destination.title} — ${destination.description}\n${url}`;
            return (
              <div key={destination.href}>
                <h2>{destination.title}</h2>
                <p>{destination.description}</p>
                <a href={url}>{url}</a>
                <CopyText text={text} />
              </div>
            );
          })}
          <div>
            <h2>Project source</h2>
            <p>
              Explore LANDVILLE’s application code and generated module pull
              requests.
            </p>
            <a
              href="https://github.com/NullPigeon/VILLE"
              target="_blank"
              rel="noreferrer"
            >
              github.com/NullPigeon/VILLE ↗
            </a>
          </div>
        </section>
      )}
      <nav className="fg-pagination" aria-label="Adjacent chapters">
        {previous ? (
          <Link href={`/docs/${previous.slug}`}>
            <ArrowLeft size={18} />
            <span>
              <small>PREVIOUS</small>
              {previous.title}
            </span>
          </Link>
        ) : (
          <Link href="/docs">
            <ArrowLeft size={18} /> Guide overview
          </Link>
        )}
        {next && (
          <Link href={`/docs/${next.slug}`}>
            <span>
              <small>NEXT CHAPTER</small>
              {next.title}
            </span>
            <ArrowRight size={18} />
          </Link>
        )}
      </nav>
    </>
  );
}
