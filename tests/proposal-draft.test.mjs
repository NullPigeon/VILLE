import test from 'node:test';
import assert from 'node:assert/strict';
import { scrapyProposalDraft } from '../lib/proposal-draft.ts';
import { buildingDesignFromBrief, buildingFinishFromBrief } from '../lib/building-design.ts';

void test('a proposal-ready Scrapy reply supplies a short title and approved plan', () => {
  const reply = 'PROPOSAL TITLE: Vlad Tenev Portrait\nPURPOSE: A civic portrait celebrating a Robinhood Chain figure.\nFUNCTIONS: Opens a large local view when clicked and closes without navigation.\nPLACEMENT: A permanent card in the World district grid.\nVISUAL: LANDVILLE scrap-poster styling with acid green details.';
  assert.deepEqual(
    scrapyProposalDraft('I want a portrait in the World.', reply),
    { title: 'Vlad Tenev Portrait', summary: `I want a portrait in the World.\n\nSCRAPY'S PLAN:\n${reply.split('\n').slice(1).join('\n')}`, worldFeatureKind: null },
  );
});

void test('a supported Scrapy World plan yields a scene feature kind', () => {
  const reply = 'PROPOSAL TITLE: Signal Mast\nWORLD CHANGE: SIGNAL_MAST\nPURPOSE: A public beacon for this district.\nFUNCTIONS: Make the district visible on the World map as a clear landmark.\nPLACEMENT: Place it near the district center.\nVISUAL: LANDVILLE metalwork, dark outlines, acid-green signal light.';
  assert.equal(scrapyProposalDraft('Please add a beacon.', reply)?.worldFeatureKind, 'SIGNAL_MAST');
});

void test('Scrapy building designs use an approved silhouette and legacy buildings get stable shapes', () => {
  assert.equal(buildingDesignFromBrief('VISUAL: iron shutters.\nBUILDING DESIGN: WORKSHOP', 'Repair shop', 'utility'), 'WORKSHOP');
  assert.equal(buildingDesignFromBrief('VISUAL: old metal.', 'Clubhouse', 'utility'), 'SALOON');
  assert.equal(buildingDesignFromBrief('VISUAL: old metal.', 'Vlad Tenev Portrait', 'utility'), 'GALLERY');
  assert.equal(buildingDesignFromBrief('VISUAL: old metal.', 'Town Hall Panic Board', 'utility'), 'RELAY');
  assert.equal(buildingDesignFromBrief('', 'Avatar Forge Window', 'art'), 'WORKSHOP');
  assert.deepEqual(buildingFinishFromBrief('BUILDING MATERIAL: OLIVE\nNEON ACCENT: CYAN'), { material: 'OLIVE', accent: 'CYAN' });
});

void test('clarifications and malformed proposal titles do not unlock submission from a reply', () => {
  assert.equal(scrapyProposalDraft('Build something.', 'Where should it live and what should it do?'), null);
  assert.equal(scrapyProposalDraft('Build something.', 'PROPOSAL TITLE: No'), null);
  assert.equal(scrapyProposalDraft('Build something.', 'PROPOSAL TITLE: Valid title'), null);
  assert.equal(scrapyProposalDraft('Build a club.', 'PROPOSAL TITLE: Clubhouse\nA room where people talk.'), null);
});
