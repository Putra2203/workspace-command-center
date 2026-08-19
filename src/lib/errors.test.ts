import { describe, it, expect } from 'vitest';
import { AppError } from './errors';

function fakeAxiosError(status?: number, message = 'request failed') {
  return {
    isAxiosError: true,
    message,
    response: status !== undefined ? { status } : undefined,
  };
}

describe('AppError.fromUnknown', () => {
  it('marks a 5xx Plane API error as retryable', () => {
    const appError = AppError.fromUnknown(fakeAxiosError(503));
    expect(appError.retryable).toBe(true);
    expect(appError.httpStatus).toBe(503);
    expect(appError.code).toBe('PLANE_API_503');
  });

  it('marks a 4xx Plane API error as non-retryable', () => {
    const appError = AppError.fromUnknown(fakeAxiosError(404));
    expect(appError.retryable).toBe(false);
    expect(appError.httpStatus).toBe(404);
    expect(appError.code).toBe('PLANE_API_404');
  });

  it('marks a network error with no response as retryable', () => {
    const appError = AppError.fromUnknown(fakeAxiosError(undefined, 'ECONNREFUSED'));
    expect(appError.retryable).toBe(true);
    expect(appError.code).toBe('PLANE_API_NETWORK_ERROR');
  });

  it('passes an existing AppError through unchanged', () => {
    const original = new AppError({
      code: 'CUSTOM',
      message: 'custom failure',
      userMessage: 'Custom failure occurred.',
      retryable: false,
    });
    expect(AppError.fromUnknown(original)).toBe(original);
  });

  it('treats an unrecognized error as retryable by default', () => {
    const appError = AppError.fromUnknown(new Error('something odd'));
    expect(appError.retryable).toBe(true);
    expect(appError.code).toBe('UNKNOWN');
  });
});
