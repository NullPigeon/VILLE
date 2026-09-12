import { NextRequest, NextResponse } from 'next/server';
import { artifactPathFor } from '@/lib/build-contract';
import { ApiError, apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { readJob, requireBuildAdmin } from '@/lib/server/builds';
import { readCityModule } from '@/lib/server/city-module';
import { enforceRate } from '@/lib/server/database';
import { generateModuleImage } from '@/lib/server/module-image';
import { proposalId } from '@/lib/server/validation';

export const maxDuration = 180;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const actor = await requireBuildAdmin(request);
    const id = proposalId((await params).id);
    const body = await jsonBody(request);
    if (body.capability !== 'module.image.generate' || !body.input || typeof body.input !== 'object' || Array.isArray(body.input)) throw new ApiError(400, 'Invalid preview image request.');
    const input = body.input as Record<string, unknown>;
    if (input.operation !== 'generate' || Object.keys(input).some((key) => !['operation', 'brief'].includes(key))) throw new ApiError(400, 'Invalid preview image request.');
    const job = await readJob(id);
    if (job.state !== 'REVIEW' || !job.content_hash) throw new ApiError(409, 'A completed builder revision is required.');
    const artifact = await readCityModule(id, artifactPathFor(id, job.revision));
    if (artifact.hash !== job.content_hash) throw new ApiError(409, 'The deployed revision does not match the reviewed artifact.');
    const declaration = artifact.module.capabilities?.imageGeneration;
    if (!declaration) throw new ApiError(403, 'This revision did not declare image generation permission.');
    await enforceRate(actor, 'module-image-preview', 3);
    const generated = await generateModuleImage(declaration, input.brief);
    return NextResponse.json({ imageUrl: `data:${generated.mimeType};base64,${generated.base64}`, mimeType: generated.mimeType, generatedAt: generated.generatedAt, cached: false, preview: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
