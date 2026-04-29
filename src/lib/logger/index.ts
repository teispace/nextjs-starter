import pino, { type Logger, type LoggerOptions } from 'pino';

import { env } from '@/lib/env';

import { LogLevel, SENSITIVE_REDACTION_PATHS } from './constants';

const isServer = typeof window === 'undefined';
const isProd = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

const level: LogLevel = isTest ? LogLevel.SILENT : isProd ? LogLevel.INFO : LogLevel.DEBUG;

const baseOptions: LoggerOptions = {
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: SENSITIVE_REDACTION_PATHS,
    censor: '[REDACTED]',
    remove: false,
  },
  serializers: {
    err: pino.stdSerializers.errWithCause,
  },
};

/**
 * Build the server-side logger.
 *
 * - test: silent (no IO, no worker threads — keeps CI output clean)
 * - dev: pino-pretty single-line colorized
 * - prod: raw JSON to stdout for log aggregators
 */
function buildServerLogger(): Logger {
  if (isTest) return pino({ ...baseOptions, level: LogLevel.SILENT });

  if (isProd) {
    return pino(baseOptions, pino.destination({ sync: false }));
  }

  return pino({
    ...baseOptions,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  });
}

/**
 * Structured logger. Prefer over `console.*`.
 *
 * Usage:
 *   logger.info('event happened');
 *   logger.error({ err }, 'something failed');
 *   const child = logger.child({ requestId, userId });
 */
export const logger: Logger = isServer ? buildServerLogger() : pino(baseOptions);

export {
  LogLevel,
  SENSITIVE_HEADERS,
  SENSITIVE_KEYS,
  SENSITIVE_REDACTION_PATHS,
} from './constants';
