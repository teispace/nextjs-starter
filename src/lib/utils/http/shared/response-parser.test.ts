import { describe, expect, it } from 'vitest';

import { ApiException } from '@/lib/errors';

import { parseApiError } from './response-parser';

describe('parseApiError', () => {
  it('builds an ApiException from a well-formed backend error envelope', () => {
    const err = parseApiError(
      {
        status: 422,
        path: '/api/v1/users',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: [{ email: 'Invalid format' }],
        requestId: 'req-abc',
      },
      422,
    );

    expect(err).toBeInstanceOf(ApiException);
    expect(err.status).toBe(422);
    expect(err.message).toBe('Validation failed');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.requestId).toBe('req-abc');
    expect(err.getErrorMessage('email')).toBe('Invalid format');
  });

  it('falls back to the response request-id when the body has none', () => {
    const err = parseApiError({ message: 'Boom' }, 500, 'req-from-header');
    expect(err.requestId).toBe('req-from-header');
  });

  it('prefers the body request-id over the header value', () => {
    const err = parseApiError(
      { message: 'Boom', requestId: 'req-from-body' },
      500,
      'req-from-header',
    );
    expect(err.requestId).toBe('req-from-body');
  });

  it('uses fallback status when body has none', () => {
    const err = parseApiError({ message: 'Network blip' }, 503);
    expect(err.status).toBe(503);
  });

  it('handles non-object bodies gracefully', () => {
    const err = parseApiError(null, 500);
    expect(err.status).toBe(500);
    expect(err.message).toBe('Request failed with status 500');
  });

  it('preserves stack when provided', () => {
    const err = parseApiError({ message: 'x' }, 500, undefined, 'fake-stack');
    expect(err.stack).toBe('fake-stack');
  });
});
