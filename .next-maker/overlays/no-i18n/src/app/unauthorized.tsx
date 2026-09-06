import Link from 'next/link';

/**
 * Rendered by `unauthorized()` from `next/navigation`. Enabled by
 * `experimental.authInterrupts` in `next.config.ts`.
 */
export default function Unauthorized() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-1 font-bold text-6xl text-gray-900 dark:text-gray-100">401</h1>
      <h2 className="mb-2 font-semibold text-gray-900 text-xl dark:text-gray-100">Sign in first</h2>
      <p className="mb-6 text-gray-500 dark:text-gray-400">This page needs a signed-in account.</p>
      <Link
        href="/auth/login"
        className="rounded-md bg-dark px-6 py-2 text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
      >
        Sign in
      </Link>
    </div>
  );
}
