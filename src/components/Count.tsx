'use client';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { decrement, increment, reset } from '@/features/counter';
import { useTranslations } from 'next-intl';

export function Count() {
  const count = useAppSelector((state) => state.count.value);
  const dispatch = useAppDispatch();
  const t = useTranslations('Count');

  return (
    <div>
      <div>{t('currentCount', { count })}</div>
      <div className="flex gap-2">
        <button
          onClick={() => dispatch(increment())}
          className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white"
        >
          {t('increment')}
        </button>
        <button
          onClick={() => dispatch(decrement())}
          className="cursor-pointer rounded bg-red-500 px-4 py-2 text-white"
        >
          {t('decrement')}
        </button>
        <button
          onClick={() => dispatch(reset())}
          className="cursor-pointer rounded bg-gray-500 px-4 py-2 text-white"
        >
          {t('reset')}
        </button>
      </div>
    </div>
  );
}
