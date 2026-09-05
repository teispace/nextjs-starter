import type { Formats } from 'next-intl';

/**
 * Named formats used across the app so dates and numbers render the same
 * everywhere: `format.dateTime(value, 'short')`, `t('price', { value })`
 * with `{value, number, currency}`. Extend here, never inline in components.
 */
export const formats = {
  dateTime: {
    short: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' },
    time: { hour: 'numeric', minute: '2-digit' },
  },
  number: {
    precise: { maximumFractionDigits: 5 },
    currency: { style: 'currency', currency: 'USD' },
    percent: { style: 'percent', maximumFractionDigits: 1 },
  },
  list: {
    enumeration: { style: 'long', type: 'conjunction' },
  },
} satisfies Formats;
