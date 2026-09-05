'use client';

import { useAppStore } from '@/store/hooks';

export const useCounter = () => {
  const value = useAppStore((state) => state.count.value);
  const inc = useAppStore((state) => state.increment);
  const dec = useAppStore((state) => state.decrement);
  const rst = useAppStore((state) => state.reset);

  return { value, inc, dec, rst } as const;
};
