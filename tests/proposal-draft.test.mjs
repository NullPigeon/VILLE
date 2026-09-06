import test from 'node:test';
import assert from 'node:assert/strict';
import { scrapyProposalDraft } from '../lib/proposal-draft.ts';

void test('a proposal-ready Scrapy reply supplies a short title and approved plan', () => {
  const reply = 'PROPOSAL TITLE: Vlad Tenev Portrait\nPURPOSE: A civic portrait celebrating a Robinhood Chain figure.\nFUNCTIONS: Opens a large local view when clicked and closes without navigation.\nPLACEMENT: A permanent card in the World district grid.\nVISUAL: LANDVILLE scrap-poster styling with acid green details.';
  assert.deepEqual(
    scrapyProposalDraft('I want a portrait in the World.', reply),
    { title: 'Vlad Tenev Portrait', summary: `I want a portrait in the World.\n\nSCRAPY'S PLAN:\n${reply.split('\n').slice(1).join('\n')}` },
  );
});

void test('clarifications and malformed proposal titles do not unlock submission from a reply', () => {
  assert.equal(scrapyProposalDraft('Build something.', 'Where should it live and what should it do?'), null);
  assert.equal(scrapyProposalDraft('Build something.', 'PROPOSAL TITLE: No'), null);
  assert.equal(scrapyProposalDraft('Build something.', 'PROPOSAL TITLE: Valid title'), null);
  assert.equal(scrapyProposalDraft('Build a club.', 'PROPOSAL TITLE: Clubhouse\nA room where people talk.'), null);
});
