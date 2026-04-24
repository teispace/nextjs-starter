/** Log levels supported by pino, narrowed to the ones we actually use. */
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
  SILENT: 'silent',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/** Field names considered sensitive anywhere in a logged object. */
export const SENSITIVE_KEYS = [
  'password',
  'passwordConfirmation',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'creditCard',
];

/** HTTP headers that potentially leak credentials or session state. */
export const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie'];

/**
 * Pino redaction paths. Covers:
 *   - `*.<sensitiveKey>` at any nesting
 *   - `req.headers["<sensitiveHeader>"]` for HTTP request logs
 *   - `req.body.<sensitiveKey>` and `req.body.*.<sensitiveKey>` one level deep
 */
export const SENSITIVE_REDACTION_PATHS = [
  ...SENSITIVE_KEYS.map((key) => `*.${key}`),
  ...SENSITIVE_HEADERS.map((header) => `req.headers["${header}"]`),
  ...SENSITIVE_KEYS.map((key) => `req.body.${key}`),
  ...SENSITIVE_KEYS.map((key) => `req.body.*.${key}`),
];
