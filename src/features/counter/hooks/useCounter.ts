'use client';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { increment, decrement, reset } from '../store';
import { selectCountValue } from '../store/counter.selectors';

export const useCounter = () => {
  const dispatch = useAppDispatch();
  const value = useAppSelector(selectCountValue);

  const inc = () => dispatch(increment());
  const dec = () => dispatch(decrement());
  const rst = () => dispatch(reset());

  return {
    value,
    inc,
    dec,
    rst,
  } as const;
};
