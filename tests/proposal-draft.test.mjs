import test from 'node:test';
import assert from 'node:assert/strict';
import { scrapyProposalDraft } from '../lib/proposal-draft.ts';

void test('a proposal-ready Scrapy reply supplies a short title and approved plan', () => {
  assert.deepEqual(
    scrapyProposalDraft('I want a portrait in the World.', 'PROPOSAL TITLE: Vlad Tenev Portrait\nA clickable LANDVILLE-style portrait that expands locally.'),
    { title: 'Vlad Tenev Portrait', summary: "I want a portrait in the World.\n\nSCRAPY'S PLAN:\nA clickable LANDVILLE-style portrait that expands locally." },
  );
});

void test('clarifications and malformed proposal titles do not unlock submission from a reply', () => {
  assert.equal(scrapyProposalDraft('Build something.', 'Where should it live and what should it do?'), null);
  assert.equal(scrapyProposalDraft('Build something.', 'PROPOSAL TITLE: No'), null);
  assert.equal(scrapyProposalDraft('Build something.', 'PROPOSAL TITLE: Valid title'), null);
});
