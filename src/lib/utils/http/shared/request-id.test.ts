import { describe, expect, it } from 'vitest';

import {
  extractRequestIdFromHeaderRecord,
  extractRequestIdFromHeaders,
  generateRequestId,
  isValidRequestId,
  REQUEST_ID_PATTERN,
} from './request-id';

describe('request-id', () => {
  it('generates IDs matching the backend pattern', () => {
    for (let i = 0; i < 20; i++) {
      const id = generateRequestId();
      expect(id).toMatch(REQUEST_ID_PATTERN);
    }
  });

  it('isValidRequestId accepts alphanumerics, dashes, underscores up to 128 chars', () => {
    expect(isValidRequestId('abc-123_DEF')).toBe(true);
    expect(isValidRequestId(generateRequestId())).toBe(true);
    expect(isValidRequestId('a'.repeat(128))).toBe(true);

    expect(isValidRequestId('')).toBe(false);
    expect(isValidRequestId('has spaces')).toBe(false);
    expect(isValidRequestId('has\nnewline')).toBe(false);
    expect(isValidRequestId('a'.repeat(129))).toBe(false);
    expect(isValidRequestId('inv@lid')).toBe(false);
  });

  it('extractRequestIdFromHeaders reads X-Request-Id case-insensitively', () => {
    const headers = new Headers({ 'x-request-id': 'abc-123' });
    expect(extractRequestIdFromHeaders(headers)).toBe('abc-123');
  });

  it('extractRequestIdFromHeaders ignores invalid values', () => {
    const headers = new Headers({ 'X-Request-Id': 'has spaces' });
    expect(extractRequestIdFromHeaders(headers)).toBeUndefined();
  });

  it('extractRequestIdFromHeaders returns undefined when missing', () => {
    expect(extractRequestIdFromHeaders(new Headers())).toBeUndefined();
    expect(extractRequestIdFromHeaders(undefined)).toBeUndefined();
  });

  it('extractRequestIdFromHeaderRecord handles plain objects (axios shape)', () => {
    expect(extractRequestIdFromHeaderRecord({ 'X-Request-Id': 'abc-123' })).toBe('abc-123');
    expect(extractRequestIdFromHeaderRecord({ 'x-request-id': 'abc-123' })).toBe('abc-123');
    expect(extractRequestIdFromHeaderRecord({ 'X-Request-Id': ['abc-123', 'dup'] })).toBe(
      'abc-123',
    );
    expect(extractRequestIdFromHeaderRecord({})).toBeUndefined();
    expect(extractRequestIdFromHeaderRecord(undefined)).toBeUndefined();
    expect(extractRequestIdFromHeaderRecord({ 'X-Request-Id': 'inv@lid' })).toBeUndefined();
  });
});
