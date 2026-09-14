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

function imageBrief(value: unknown) {
  const hasUnsafeControl = typeof value === 'string' && Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  });
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > 280 || hasUnsafeControl) {
    throw new ApiError(400, 'Describe the image in 1–280 characters.');
  }
  return value.trim();
}

function isCharacterCutout(declaration: ModuleImageGenerationDeclaration) {
  const reviewedIntent = `${declaration.purpose}\n${declaration.visualDirection}`.toLowerCase();
  return /\b(avatar|character|full-body|world resident|world publication)\b/.test(reviewedIntent);
}

function promptFor(declaration: ModuleImageGenerationDeclaration, brief: string, choiceIndex: number, providerRetry = false) {
  const characterCutout = isCharacterCutout(declaration);
  const variation = [
    'Stay closest to the primary brief and use a clear, confident pose.',
    'Keep the same identity but explore a more expressive pose and different LANDVILLE construction details.',
    'Keep the same identity but make Scrapy\'s improvised twist bolder while preserving every iconic cue.',
  ][choiceIndex];
  const quantity = `Create one polished ${characterCutout ? 'vertical character cutout' : 'square raster artwork'} for a sandboxed LANDVILLE city module.${declaration.maxImages === 3 ? ` This is independent choice ${choiceIndex + 1} of 3. ${variation}` : ''} Do not show alternate choices inside this image.`;
  const retryRule = providerRetry
    ? 'PROVIDER-SAFE RETRY: Render this as harmless original LANDVILLE fan art. Keep recognizable non-logo visual cues from the requested identity, but omit weapons, violence, threatening action, official branding and exact emblems.'
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
${subjectRules}
${retryRule}

The citizen brief controls the subject while the reviewed module declaration controls safe composition and capability boundaries. Make the finish unmistakably LANDVILLE and Scrapy-authored: tactile weathered printmaking, patched materials, warm rust and paper tones, restrained acid-lime repairs, a strong silhouette, sly municipal humor and one small improvised detail that complements the requested identity. Avoid generic cyberpunk, generic vector avatars, bland trait grids, stock UI, watermarks, signatures, logos, URLs, tiny text and illegible typography. Do not add text unless the reviewed direction explicitly requires it. Return only the image.`;
}

function validBase64Image(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 100 && value.length <= MAX_IMAGE_BASE64 && /^[A-Za-z0-9+/=]+$/.test(value);
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
  const generateChoice = async (choiceIndex: number) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            model,
            prompt: promptFor(declaration, brief, choiceIndex, attempt === 1),
            n: 1,
            size: characterCutout ? '1024x1536' : '1024x1024',
            quality: 'medium',
            output_format: 'webp',
            output_compression: 82,
            moderation: 'auto',
            ...(characterCutout ? { background: 'transparent' } : {}),
          }),
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(165_000),
        });
      } catch { throw new ApiError(503, 'The image workshop timed out. Try again later.'); }
      if (!response.ok) {
        if (response.status === 429) throw new ApiError(429, 'The image workshop is busy. Try again later.');
        if (response.status >= 400 && response.status < 500 && attempt === 0) {
          await response.arrayBuffer().catch(() => undefined);
          continue;
        }
        if (response.status >= 400 && response.status < 500) throw new ApiError(422, 'That character could not be generated even after Scrapy simplified the request. Try a more descriptive identity.');
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
    throw new ApiError(503, 'The image workshop is temporarily unavailable.');
  };
  const base64Images = await Promise.all(Array.from({ length: declaration.maxImages }, (_, choiceIndex) => generateChoice(choiceIndex)));
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
