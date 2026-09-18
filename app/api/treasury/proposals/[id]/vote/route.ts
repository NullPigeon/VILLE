import { NextRequest } from 'next/server';
import {
  ApiError,
  apiFailure,
  requireMutation,
  requireWallet,
} from '@/lib/server/api';

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    requireWallet(request);
    throw new ApiError(
      503,
      'Treasury voting is unavailable while the Treasury is under reconstruction.',
    );
  } catch (error) {
    return apiFailure(error);
  }
}
