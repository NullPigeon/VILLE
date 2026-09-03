import 'server-only';
import { ApiError } from '@/lib/server/api';

export function field(body: Record<string, unknown>, key: string, min: number, max: number) {
  const value = body[key];
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new ApiError(400, `${key} must contain ${min}–${max} characters.`);
  return value.trim();
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new ApiError(400, 'Invalid action or category.');
  return value as T;
}

export function proposalId(value: string) {
  if (!/^LV-[1-9][0-9]{0,15}$/.test(value)) throw new ApiError(400, 'Invalid proposal ID.');
  return value;
}

export function requestId(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new ApiError(400, 'A valid submission ID is required.');
  return value.toLowerCase();
}
