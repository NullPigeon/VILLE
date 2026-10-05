import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { SCRAPY_TOKEN } from '../lib/scrapy-token.ts';

// Load the actual content module, resolving its one Next.js alias without a server.
const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/field-guide.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require(name) {
    assert.equal(name, '@/lib/scrapy-token');
    return { SCRAPY_TOKEN };
  },
});
const { guideArticles, townDestinations, findGuide } = exports;

void test('every guide chapter has a unique route and working section anchors', () => {
  const slugs = new Set();
  for (const article of guideArticles) {
    assert.match(article.slug, /^[a-z][a-z0-9-]+$/);
    assert.ok(!slugs.has(article.slug), `Duplicate chapter: ${article.slug}`);
    slugs.add(article.slug);
    assert.ok(
      article.title &&
        article.summary &&
        article.group &&
        article.sections.length,
    );
    const anchors = new Set();
    for (const section of article.sections) {
      assert.match(section.id, /^[a-z][a-z0-9-]+$/);
      assert.ok(
        !anchors.has(section.id),
        `Duplicate anchor: ${article.slug}#${section.id}`,
      );
      anchors.add(section.id);
      assert.ok(section.title && section.paragraphs.length);
      if (section.table)
        for (const row of section.table.rows)
          assert.equal(row.length, section.table.headings.length);
    }
    assert.equal(findGuide(article.slug), article);
  }
  assert.equal(findGuide('not-a-real-chapter'), undefined);
});

void test('all town destinations have real pages and matching documentation', () => {
  assert.equal(townDestinations.length, 6);
  assert.equal(new Set(townDestinations.map((item) => item.id)).size, 6);
  const destinations = [
    ...townDestinations.map((item) => item.href),
    ...guideArticles.map((item) => item.destination).filter(Boolean),
  ];
  for (const href of destinations)
    assert.ok(
      existsSync(resolve(root, `app${href}/page.tsx`)),
      `Missing route: ${href}`,
    );
  for (const item of townDestinations) {
    assert.ok(findGuide(item.guide), `Missing guide for ${item.id}`);
    // X counts each URL as 23 characters; leave room below 280.
    assert.ok(`${item.title} — ${item.description}`.length + 24 < 280);
  }
});

void test('guide includes official token identity and separates future capabilities', () => {
  assert.ok(
    JSON.stringify(findGuide('scrapy-token')).includes(SCRAPY_TOKEN.address),
  );
  for (const slug of [
    'builder',
    'weekly-likes',
    'transactions',
    'roadmap',
    'links',
    'help',
  ])
    assert.ok(findGuide(slug));
  const roadmap = JSON.stringify(findGuide('roadmap'));
  for (const topic of ['Video', 'audio', 'Staking', 'minting', 'NFT', 'RWA'])
    assert.ok(roadmap.includes(topic));
  assert.ok(roadmap.includes('not active features'));
});
