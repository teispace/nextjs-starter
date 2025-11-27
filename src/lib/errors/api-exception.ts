export class ApiException extends Error {
  status: number;
  errors?: Record<string, string>[];

  constructor({
    status,
    message,
    errors,
    stack,
  }: {
    status: number;
    message: string;
    errors?: Record<string, string>[];
    stack?: string;
  }) {
    super(message);
    this.status = status;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    }

    Object.setPrototypeOf(this, ApiException.prototype);
  }

  static convertAny(error: unknown): ApiException {
    if (error instanceof ApiException) return error;

    if (error instanceof Error) {
      return new ApiException({
        status: 500,
        message: error.message,
        stack: error.stack,
      });
    }

    return new ApiException({
      status: 500,
      message: 'An unknown error occurred',
    });
  }

  containsKey(key: string): boolean {
    if (!this.errors) return false;
    return this.errors.some((err) => key in err);
  }

  getErrorMessage(key: string): string | undefined {
    if (!this.errors) return undefined;
    const err = this.errors.find((err) => key in err);
    return err ? String(err[key]) : undefined;
  }

  getErrorMessageIfExists(key: string): string {
    return this.getErrorMessage(key) || this.message;
  }

  getFieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    if (!this.errors) return result;

    for (const err of this.errors) {
      const [key, value] = Object.entries(err)[0];
      result[key] = String(value);
    }

    return result;
  }
}
