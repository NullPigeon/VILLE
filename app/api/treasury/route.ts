import { NextRequest } from 'next/server';
import { ApiError, apiFailure } from '@/lib/server/api';

export async function GET(request: NextRequest) {
  try {
    void request;
    throw new ApiError(
      503,
      'Treasury is under reconstruction. Public data and actions are temporarily unavailable.',
    );
  } catch (error) {
    return apiFailure(error);
  }
}
