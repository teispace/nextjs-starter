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
 * Pino redaction paths. Pino's single `*` wildcard matches exactly one level
 * (it is NOT recursive), and `*.<key>` does NOT match a key at the root — so
 * each shape that can carry a secret is listed explicitly:
 *   - `<sensitiveKey>` at the root: `logger.info({ token })`
 *   - `*.<sensitiveKey>` one level deep: `{ user: { token } }`
 *   - `<sensitiveHeader>` headers at the root (`{ headers: { authorization } }`)
 *     and one parent deep (`req.headers` / `res.headers` / `response.headers`)
 *   - `req.body.<sensitiveKey>` and `req.body.*.<sensitiveKey>` for HTTP logs
 *
 * Arbitrarily deep nesting (`{ a: { b: { token } } }`) is not covered — keep
 * log surfaces shallow (scalars, `{ err }`, explicit child bindings).
 */
export const SENSITIVE_REDACTION_PATHS = [
  ...SENSITIVE_KEYS,
  ...SENSITIVE_KEYS.map((key) => `*.${key}`),
  ...SENSITIVE_HEADERS.map((header) => `headers["${header}"]`),
  ...SENSITIVE_HEADERS.map((header) => `*.headers["${header}"]`),
  ...SENSITIVE_KEYS.map((key) => `req.body.${key}`),
  ...SENSITIVE_KEYS.map((key) => `req.body.*.${key}`),
];
