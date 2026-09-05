import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-1 font-bold text-6xl text-gray-900 dark:text-gray-100">404</h1>
      <h2 className="mb-2 font-semibold text-gray-900 text-xl dark:text-gray-100">
        Page not found
      </h2>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-md bg-dark px-6 py-2 text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
      >
        Go home
      </Link>
    </div>
  );
}
