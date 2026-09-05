import { HttpError, isAppError, type PlainHttpError } from '@/lib/errors';

/**
 * The server-error shape every action returns in `result.serverError`.
 * Plain data on purpose: it crosses the RSC boundary and lands in client
 * state. `HttpError.fromPlain` rebuilds a class instance when one is wanted.
 */
export type ActionError = PlainHttpError;

export const ACTION_ERROR_CODE = {
  UNAUTHENTICATED: 'ERR_UNAUTHENTICATED',
  FORBIDDEN: 'ERR_FORBIDDEN',
  INTERNAL: 'ERR_INTERNAL',
} as const;

export const actionError = (
  code: string,
  message: string,
  status: number,
  extra: Partial<ActionError> = {},
): ActionError => ({ kind: 'HttpError', code, message, status, ...extra });

/** Map anything thrown inside an action to the client-safe shape. */
export const toActionError = (error: unknown): ActionError => {
  if (error instanceof HttpError) return error.toPlain();
  if (isAppError(error)) return actionError(error.code, error.message, 500);
  // Unknown errors are not echoed: their messages can carry internals.
  return actionError(ACTION_ERROR_CODE.INTERNAL, 'Something went wrong. Please try again.', 500);
};
