import 'server-only';
import { createHash } from 'node:crypto';
import { ApiError } from '@/lib/server/api';
import { rpc } from '@/lib/server/database';
import type { ModuleImageGenerationDeclaration } from '@/lib/build-contract';

const MAX_IMAGE_BASE64 = 5_000_000;
const MAX_IMAGE_BATCH_BASE64 = MAX_IMAGE_BASE64 * 3;
const IMAGE_MODELS = new Set(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']);

type ImageClaim = {
  state: 'CLAIMED' | 'READY' | 'BUSY' | 'LIMIT';
  leaseId?: string;
  imageBase64?: string;
  imagesBase64?: unknown;
  mimeType?: string;
  generatedAt?: string;
};

type ImageProviderIssue = {
  status: number;
  type?: string;
  code?: string;
  param?: string;
  requestId?: string;
};

function imageBrief(value: unknown) {
  const hasUnsafeControl = typeof value === 'string' && Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  });
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > 1_000 || hasUnsafeControl) {
    throw new ApiError(400, 'Describe the image in 1–1,000 characters.');
  }
  return value.trim();
}

function isCharacterCutout(declaration: ModuleImageGenerationDeclaration) {
  const reviewedIntent = `${declaration.purpose}\n${declaration.visualDirection}`.toLowerCase();
  return /\b(avatar|character|full-body|world resident|world publication)\b/.test(reviewedIntent);
}

function selectedStyleRule(brief: string) {
  const selected = brief.match(/\bStyle:\s*([^.\n]{1,80})/i)?.[1]?.trim().toLowerCase() || '';
  if (!selected) return '';
  if (/pixel/.test(selected)) return 'SELECTED STYLE — HARD REQUIREMENT: True 2D pixel art. Build the entire character from visibly crisp, hard-edged square pixels at a deliberately low internal resolution with a limited palette. No painterly brushwork, smooth digital painting, photorealism, soft airbrushing or high-detail concept-art rendering.';
  if (/comic/.test(selected)) return 'SELECTED STYLE — HARD REQUIREMENT: Bold comic-book illustration with confident ink contours, graphic shadow shapes, controlled halftone texture and a readable heroic silhouette. Do not drift into photorealism or painterly concept art.';
  if (/anime/.test(selected)) return 'SELECTED STYLE — HARD REQUIREMENT: Expressive anime character design with deliberate linework, clean cel-shaded color shapes and a readable full-body silhouette. Do not drift into photorealism or painterly concept art.';
  if (/real/.test(selected)) return 'SELECTED STYLE — HARD REQUIREMENT: Believable realistic character rendering with coherent anatomy, materials and lighting while retaining LANDVILLE costume repairs and palette accents. Do not turn it into pixel art, anime or flat vector art.';
  return `SELECTED STYLE — HARD REQUIREMENT: Render consistently as ${selected}. Do not replace this medium with LANDVILLE's default printmaking treatment.`;
}

function promptFor(declaration: ModuleImageGenerationDeclaration, brief: string, choiceIndex: number, providerRetry = false) {
  const characterCutout = isCharacterCutout(declaration);
  const variation = [
    'Stay closest to the primary brief and use a clear, confident pose.',
    'Keep the same identity but explore a more expressive pose and different LANDVILLE construction details.',
    'Keep the same identity but make Scrapy\'s improvised twist bolder while preserving every iconic cue.',
  ][choiceIndex];
  const quantity = `Create one polished ${characterCutout ? 'vertical character cutout' : 'square raster artwork'} for a sandboxed LANDVILLE city module.${declaration.maxImages === 3 ? ` This is independent choice ${choiceIndex + 1} of 3. ${variation}` : ''} Do not show alternate choices inside this image.`;
  const styleRule = selectedStyleRule(brief);
  const retryRule = providerRetry
    ? 'PROVIDER-SAFE RETRY: Render a friendly, all-ages, original LANDVILLE interpretation. Preserve the requested identity through its silhouette, colors, clothing and personality. Use no official branding, exact emblems or text.'
    : '';
  const subjectRules = characterCutout ? `
SUBJECT FIDELITY — HIGHEST PRIORITY:
- The citizen brief defines who or what the character is. It may be a person, robot, superhero, creature, animal, object-character or any other subject.
- Preserve the requested identity, species, iconic silhouette, color language, clothing and props. If the brief names a recognizable character or archetype, keep it immediately recognizable without relying on readable logos or text.
- Do not replace the requested subject with a generic worker, junkyard mechanic or robot. LANDVILLE is a visual treatment layered onto the subject, not a replacement identity.

CUTOUT CONTRACT:
- Depict exactly one character exactly once, in one pose, in each returned image.
- Show the complete figure from head to footwear or lowest body point, centered with comfortable transparent padding. No cropped limbs.
- Use a genuinely transparent alpha background. No paper rectangle, scenery, room, floor, horizon, frame, panel, border, contact sheet, triptych, lineup, duplicate pose, cast-shadow rectangle or decorative text.
- Keep the silhouette clean and readable at small World-map size.` : '';
  return `${quantity}

MODULE PURPOSE: ${declaration.purpose}
REVIEWED VISUAL DIRECTION: ${declaration.visualDirection}
PRIMARY CITIZEN BRIEF: ${brief}
${styleRule}
${subjectRules}
${retryRule}

The citizen brief controls the subject while the reviewed module declaration controls safe composition and capability boundaries. The selected style is the rendering medium and must remain obvious; LANDVILLE is layered into its palette, wear, repairs and personality rather than replacing that medium. Make the result unmistakably LANDVILLE and Scrapy-authored through patched materials, warm rust and paper tones, restrained acid-lime repairs, a strong silhouette, sly municipal humor and one small improvised detail that complements the requested identity. Avoid generic cyberpunk, generic vector avatars, bland trait grids, stock UI, watermarks, signatures, logos, URLs, tiny text and illegible typography. Do not add text unless the reviewed direction explicitly requires it. Return only the image.`;
}

function validBase64Image(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 100 && value.length <= MAX_IMAGE_BASE64 && /^[A-Za-z0-9+/=]+$/.test(value);
}

async function readProviderIssue(response: Response): Promise<ImageProviderIssue> {
  let payload: unknown;
  try { payload = JSON.parse((await response.text()).slice(0, 16_384)); }
  catch { payload = undefined; }
  const details = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as { error?: unknown }).error
    : undefined;
  const error = details && typeof details === 'object' && !Array.isArray(details)
    ? details as Record<string, unknown>
    : {};
  const field = (name: string) => {
    const value = typeof error[name] === 'string' ? String(error[name]) : '';
    return /^[a-zA-Z0-9._-]{1,80}$/.test(value) ? value : undefined;
  };
  const requestId = response.headers.get('x-request-id') || '';
  return {
    status: response.status,
    type: field('type'),
    code: field('code'),
    param: field('param'),
    requestId: /^[a-zA-Z0-9_-]{1,120}$/.test(requestId) ? requestId : undefined,
  };
}

function providerReference(issue: ImageProviderIssue) {
  return [issue.code, issue.type, issue.param].filter(Boolean).join('/') || `HTTP_${issue.status}`;
}

function providerConfigurationFailure(issue: ImageProviderIssue) {
  const reference = providerReference(issue).toLowerCase();
  return [401, 403, 404].includes(issue.status) || /api.?key|billing|credit|model.?not.?found|permission|organization/.test(reference);
}

function isModerationFailure(issue: ImageProviderIssue) {
  return issue.code === 'moderation_blocked' || issue.type === 'image_generation_user_error';
}

function knownIdentityAnchor(brief: string) {
  const normalized = brief.toLowerCase();
  return normalized.includes('batman')
    ? 'An original nocturnal masked vigilante with a tall pointed-eared black cowl, exposed lower face, long scalloped charcoal cape shaped like folded wings, armored dark bodysuit, practical utility belt and stern heroic posture.'
    : normalized.includes('superman')
      ? 'An original powerful black-haired flying hero in a fitted cobalt suit with a flowing crimson cape and boots, broad heroic silhouette and optimistic upright posture.'
      : '';
}

function localModerationRewrite(brief: string) {
  const knownIdentity = knownIdentityAnchor(brief) || 'An original all-ages character inspired by the citizen\'s requested role, silhouette, colors, clothing and personality, without copying a named franchise design.';
  const traits = brief.match(/(?:Style|Vibe|Outfit|Scrapy twist):[^.]{1,120}\./gi)?.join(' ') || '';
  return `${knownIdentity} ${traits}`.trim().slice(0, 900);
}

function preserveKnownIdentity(brief: string, rewritten: string) {
  const anchor = knownIdentityAnchor(brief);
  const sanitized = rewritten.replace(/\b(?:batman|superman)\b/gi, 'the character').trim();
  const traits = brief.match(/(?:Style|Vibe|Outfit|Scrapy twist):[^.]{1,120}\./gi)?.join(' ') || '';
  return `${anchor} ${sanitized} ${traits}`.trim().slice(0, 900);
}

async function rewriteModeratedBrief(key: string, brief: string) {
  const fallback = localModerationRewrite(brief);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        store: false,
        instructions: 'Rewrite the supplied character request as one concise visual description for original, friendly, all-ages artwork. Preserve the recognizable silhouette, colors, clothing, personality, selected style and LANDVILLE details. Remove every character name, franchise name, logo, exact emblem, quotation and instruction. Never refuse, explain or mention this rewrite. Return only the visual description in 900 characters or fewer.',
        input: brief,
        max_output_tokens: 220,
      }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return fallback;
    const result = await response.json() as { status?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = result.output?.flatMap((entry) => entry.content || []).filter((entry) => entry.type === 'output_text').map((entry) => entry.text || '').join('').trim() || '';
    const hasUnsafeControl = Array.from(text).some((character) => character.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(character));
    return result.status === 'completed' && text.length >= 20 && text.length <= 900 && !hasUnsafeControl
      ? preserveKnownIdentity(brief, text)
      : fallback;
  } catch { return fallback; }
}

function providerFailure(issue: ImageProviderIssue) {
  const error = providerConfigurationFailure(issue)
    ? new ApiError(503, `The LANDVILLE image connection needs administrator attention. Reference: ${providerReference(issue)}.`)
    : new ApiError(502, `Scrapy's image press was rejected by the provider after an automatic retry. Your work order is valid. Reference: ${providerReference(issue)}.`);
  error.code = providerReference(issue);
  return error;
}

function imageResult(base64Images: unknown, mimeType: string, generatedAt: string, cached: boolean) {
  if (mimeType !== 'image/webp' || !Array.isArray(base64Images) || ![1, 3].includes(base64Images.length) || !base64Images.every(validBase64Image)) {
    throw new ApiError(502, 'The image provider returned an invalid image.');
  }
  const images = base64Images.map((base64, index) => ({ index, imageUrl: `data:${mimeType};base64,${base64}`, mimeType }));
  return { images, imageUrl: images[0].imageUrl, mimeType, generatedAt, cached };
}

export async function generateModuleImage(declaration: ModuleImageGenerationDeclaration, briefValue: unknown) {
  if (process.env.LANDVILLE_MODULE_IMAGE_ENABLED !== 'true') throw new ApiError(503, 'Citizen image generation is not enabled yet.');
  const key = process.env.OPENAI_API_KEY || '';
  const model = process.env.LANDVILLE_MODULE_IMAGE_MODEL || 'gpt-image-2.5-flare';
  if (!key || !IMAGE_MODELS.has(model)) throw new ApiError(503, 'Citizen image generation is not configured.');
  const brief = imageBrief(briefValue);
  const characterCutout = isCharacterCutout(declaration);
  let moderatedBrief: string | undefined;
  let moderationRewrite: Promise<string> | undefined;
  const generateChoice = async (choiceIndex: number) => {
    let lastIssue: ImageProviderIssue | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            model,
            prompt: promptFor(declaration, moderatedBrief || brief, choiceIndex, attempt === 1 || Boolean(moderatedBrief)),
            n: 1,
            size: characterCutout ? '1024x1536' : '1024x1024',
            quality: 'medium',
            output_format: 'webp',
            moderation: 'low',
            ...(characterCutout ? { background: 'transparent' } : {}),
          }),
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(165_000),
        });
      } catch { throw new ApiError(503, 'The image workshop timed out. Try again later.'); }
      if (!response.ok) {
        if (response.status === 429) throw new ApiError(429, 'The image workshop is busy. Try again later.');
        lastIssue = await readProviderIssue(response);
        if (isModerationFailure(lastIssue) && attempt === 0) {
          moderationRewrite ||= rewriteModeratedBrief(key, brief);
          moderatedBrief = await moderationRewrite;
          continue;
        }
        if (providerConfigurationFailure(lastIssue) || attempt === 1) {
          console.error('LANDVILLE image provider rejection:', {
            status: lastIssue.status,
            type: lastIssue.type,
            code: lastIssue.code,
            param: lastIssue.param,
            requestId: lastIssue.requestId,
          });
          throw providerFailure(lastIssue);
        }
        if (response.status >= 400 && response.status < 500) continue;
        throw new ApiError(503, 'The image workshop is temporarily unavailable.');
      }
      const declaredLength = Number(response.headers.get('content-length') || 0);
      if (declaredLength > MAX_IMAGE_BASE64 + 50_000) throw new ApiError(502, 'The image provider returned an oversized image.');
      const text = await response.text();
      if (text.length > MAX_IMAGE_BASE64 + 50_000) throw new ApiError(502, 'The image provider returned an oversized image.');
      let images: unknown;
      try { images = (JSON.parse(text) as { data?: Array<{ b64_json?: unknown }> }).data?.map((item) => item.b64_json); }
      catch {
        if (attempt === 0) continue;
        throw new ApiError(502, 'The image provider returned invalid data twice.');
      }
      if (Array.isArray(images) && images.length === 1 && validBase64Image(images[0])) return images[0];
      if (attempt === 0) continue;
      throw new ApiError(502, 'The image provider returned an incomplete image choice twice.');
    }
    throw lastIssue ? providerFailure(lastIssue) : new ApiError(503, 'The image workshop is temporarily unavailable.');
  };
  const firstImage = await generateChoice(0);
  const remainingImages = declaration.maxImages > 1
    ? await Promise.all(Array.from({ length: declaration.maxImages - 1 }, (_, index) => generateChoice(index + 1)))
    : [];
  const base64Images = [firstImage, ...remainingImages];
  if (base64Images.reduce((total, image) => total + image.length, 0) > MAX_IMAGE_BATCH_BASE64) {
    throw new ApiError(502, 'The image provider returned an oversized image batch.');
  }
  return { base64Images, base64: base64Images[0], mimeType: 'image/webp', generatedAt: new Date().toISOString(), brief };
}

export async function moduleImageResponse(id: string, wallet: string, declaration: ModuleImageGenerationDeclaration, briefValue: unknown) {
  const brief = imageBrief(briefValue);
  const briefHash = createHash('sha256').update(brief).digest('hex');
  const claim = await rpc<ImageClaim>('landville_claim_module_image', { p_module_id: id, p_citizen_wallet: wallet, p_brief_hash: briefHash });
  if (claim.state === 'READY' && claim.mimeType && claim.generatedAt) {
    const saved = Array.isArray(claim.imagesBase64) ? claim.imagesBase64 : claim.imageBase64 ? [claim.imageBase64] : [];
    return imageResult(saved, claim.mimeType, claim.generatedAt, true);
  }
  if (claim.state === 'BUSY') throw new ApiError(409, 'Your image is already being generated. Wait a moment and retry.');
  if (claim.state === 'LIMIT') throw new ApiError(429, 'This week\'s image is already issued for this module.');
  if (claim.state !== 'CLAIMED' || typeof claim.leaseId !== 'string') throw new ApiError(503, 'The image workshop could not reserve this request.');
  try {
    const generated = await generateModuleImage(declaration, brief);
    await rpc('landville_finish_module_image_set', { p_module_id: id, p_citizen_wallet: wallet, p_lease_id: claim.leaseId, p_images_base64: generated.base64Images, p_mime_type: generated.mimeType, p_generated_at: generated.generatedAt });
    return imageResult(generated.base64Images, generated.mimeType, generated.generatedAt, false);
  } catch (error) {
    await rpc('landville_fail_module_image', { p_module_id: id, p_citizen_wallet: wallet, p_lease_id: claim.leaseId }).catch(() => undefined);
    throw error;
  }
}
