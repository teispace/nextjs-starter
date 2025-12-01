'use client';
import { useCounter } from '../hooks/useCounter';
import { useTranslations } from 'next-intl';

export function Counter() {
  const { value, inc, dec, rst } = useCounter();
  const t = useTranslations('Count');

  return (
    <div>
      <div>{t('currentCount', { count: value })}</div>
      <div className="flex gap-2">
        <button onClick={inc} className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white">
          {t('increment')}
        </button>
        <button onClick={dec} className="cursor-pointer rounded bg-red-500 px-4 py-2 text-white">
          {t('decrement')}
        </button>
        <button onClick={rst} className="cursor-pointer rounded bg-gray-500 px-4 py-2 text-white">
          {t('reset')}
        </button>
      </div>
    </div>
  );
}

export default Counter;
