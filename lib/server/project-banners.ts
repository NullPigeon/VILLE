import 'server-only';
import { ApiError } from '@/lib/server/api';

export type ProjectBannerInput = {
  name: string;
  twitter_url: string;
  website_url: string;
  description: string;
  image_url: string;
  active: boolean;
  display_order: number;
};

function httpsUrl(value: unknown, name: string, allowedHosts?: string[]) {
  if (typeof value !== 'string' || value.length > 2048) throw new ApiError(400, `Invalid ${name}.`);
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new ApiError(400, `Invalid ${name}.`); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || (allowedHosts && !allowedHosts.includes(url.hostname.toLowerCase()))) throw new ApiError(400, `Invalid ${name}.`);
  return url.toString();
}

export function projectBannerInput(body: Record<string, unknown>): ProjectBannerInput {
  if (Object.keys(body).some((key) => !['name', 'twitterUrl', 'websiteUrl', 'description', 'imageUrl', 'active', 'displayOrder'].includes(key))) throw new ApiError(400, 'Unsupported banner field.');
  if (typeof body.name !== 'string' || typeof body.description !== 'string' || typeof body.active !== 'boolean') throw new ApiError(400, 'Complete every banner field.');
  const name = body.name.trim();
  const description = body.description.trim();
  if (name.length < 2 || name.length > 80) throw new ApiError(400, 'Project name must be 2–80 characters.');
  if (description.length < 10 || description.length > 280) throw new ApiError(400, 'Description must be 10–280 characters.');
  const displayOrder = Number(body.displayOrder);
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 9999) throw new ApiError(400, 'Display order must be 0–9999.');
  return {
    name,
    twitter_url: httpsUrl(body.twitterUrl, 'X/Twitter URL', ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']),
    website_url: httpsUrl(body.websiteUrl, 'project website'),
    description,
    image_url: httpsUrl(body.imageUrl, 'banner image URL'),
    active: body.active,
    display_order: displayOrder,
  };
}

export function bannerId(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new ApiError(400, 'Invalid banner ID.');
  return value.toLowerCase();
}
