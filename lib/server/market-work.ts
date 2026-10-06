import 'server-only';
import { createHash } from 'node:crypto';
import { ApiError } from '@/lib/server/api';
import type { CityPaidServiceId } from '@/lib/market-services';

const instructions: Record<CityPaidServiceId, string> = {
  'city-brief': 'You are a LANDVILLE city planning assistant. Turn the user idea into a concise brief with: purpose, who uses it, one interaction, and one sensible next step. Be realistic. Do not claim a building was approved or built.',
  'copy-bench': 'Write concise, original public-facing copy from the user request. Include one main version and one alternative. Avoid claims you cannot verify.',
  'translation-dock': 'Translate the user text to the requested target language. Preserve meaning and tone. Return only the translation. If no target language is specified, ask for it in one short sentence.',
  'agent-plan': 'Turn the user goal into 3-6 concrete, bounded agent steps. State what input each step needs and what output it should produce. Never claim actions or transactions already happened.',
};

export async function performMarketWork(service: CityPaidServiceId, prompt: string, payer: string) {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.LANDVILLE_MARKET_MODEL?.trim();
  if (!key || !model) throw new ApiError(503, 'The city AI provider is unavailable. No payment was settled.');
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false, instructions: instructions[service], input: prompt, max_output_tokens: 650,
        safety_identifier: createHash('sha256').update(`landville:market:${payer.toLowerCase()}`).digest('hex'),
      }),
      redirect: 'error', signal: AbortSignal.timeout(25_000),
    });
  } catch { throw new ApiError(503, 'City AI is temporarily unavailable. No payment was settled.'); }
  if (!response.ok) throw new ApiError(503, 'City AI is temporarily unavailable. No payment was settled.');
  const result = await response.json().catch(() => null) as {
    status?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  } | null;
  const text = result?.output?.flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text').map((item) => item.text || '').join('').trim();
  if (result?.status !== 'completed' || !text) throw new ApiError(503, 'City AI did not finish. No payment was settled.');
  return text.slice(0, 2400);
}
