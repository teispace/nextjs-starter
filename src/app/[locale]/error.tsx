'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Something went wrong
      </h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="bg-dark text-light dark:bg-light dark:text-dark cursor-pointer rounded-md px-6 py-2 text-sm transition-opacity hover:opacity-80"
      >
        Try again
      </button>
    </div>
  );
}
