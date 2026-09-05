import { HTTP_ERROR_CODE, HttpError } from './http-error';

export interface ValidationIssue {
  readonly message: string;
  readonly path: string;
}

/**
 * The server answered 2xx but the body did not match the schema the caller
 * passed. Treated as a failed request so a contract drift shows up at the
 * call site instead of as `undefined` deep inside a component.
 */
export class ResponseValidationError extends HttpError {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[], requestId?: string) {
    super({
      status: 200,
      code: HTTP_ERROR_CODE.RESPONSE_INVALID,
      message: `Response did not match the expected schema (${issues.length} issue${issues.length === 1 ? '' : 's'})`,
      requestId,
    });
    this.issues = issues;
  }
}
