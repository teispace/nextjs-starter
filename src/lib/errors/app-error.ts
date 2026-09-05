/**
 * Base class for every error the application raises on purpose.
 *
 * `code` is a stable, machine-readable identifier callers branch on; the
 * message is for humans and logs. `cause` follows the standard `Error` option
 * so the original failure is preserved for tracing.
 */
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, options: { code?: string; cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code ?? 'ERR_APP';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;
