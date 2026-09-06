import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const sourcePaths = [
  'scripts/LANDVILLE_BUILDER.md',
  'app/globals.css',
  'app/product.css',
  'app/world/page.tsx',
  'app/chat/page.tsx',
  'app/proposals/page.tsx',
  'app/treasury/page.tsx',
  'components/landville/product-shell.tsx',
  'components/landville/city-module-frame.tsx',
  'components/landville/provider.tsx',
  'city-modules/README.md',
  'lib/build-contract.ts',
  'lib/landville-data.ts',
  'lib/governance.ts',
  'lib/proposal-lifecycle.ts',
  'lib/scrapy-token.ts',
  'lib/robinhood-chain.ts',
];

const MAX_SOURCE_CHARS = 140_000;
const MAX_REFERENCE_BYTES = 5_000_000;

export async function loadBuilderContext(root = process.cwd(), read = readFile) {
  const sources = [];
  let remaining = MAX_SOURCE_CHARS;
  for (const path of sourcePaths) {
    const raw = await read(join(root, path), 'utf8');
    const text = String(raw).slice(0, remaining);
    sources.push({ path, text });
    remaining -= text.length;
    if (remaining <= 0) break;
  }
  const reference = await read(join(root, 'public', 'landville-reference.png'));
  if (!Buffer.isBuffer(reference) || reference.length < 1 || reference.length > MAX_REFERENCE_BYTES) throw new Error('Invalid LANDVILLE visual reference.');
  return {
    sources,
    referenceImage: `data:image/png;base64,${reference.toString('base64')}`,
  };
}

export function builderInput(text, context, extraImages = []) {
  return [{
    role: 'user',
    content: [
      { type: 'input_text', text },
      { type: 'input_image', image_url: context.referenceImage, detail: 'low' },
      ...extraImages.map((image_url) => ({ type: 'input_image', image_url, detail: 'high' })),
    ],
  }];
}
