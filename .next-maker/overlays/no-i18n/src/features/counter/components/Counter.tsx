'use client';

import { useCounter } from '../hooks/useCounter';

export function Counter() {
  const { value, inc, dec, rst } = useCounter();

  return (
    <div>
      <div>Current Count: {value}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={inc}
          className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white"
        >
          Increment
        </button>
        <button
          type="button"
          onClick={dec}
          className="cursor-pointer rounded bg-red-500 px-4 py-2 text-white"
        >
          Decrement
        </button>
        <button
          type="button"
          onClick={rst}
          className="cursor-pointer rounded bg-gray-500 px-4 py-2 text-white"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default Counter;
