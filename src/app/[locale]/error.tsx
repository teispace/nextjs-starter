'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 font-bold text-2xl text-gray-900 dark:text-gray-100">
        Something went wrong
      </h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer rounded-md bg-dark px-6 py-2 text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
      >
        Try again
      </button>
    </div>
  );
}
