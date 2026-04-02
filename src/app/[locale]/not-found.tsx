import { Link } from '@/i18n/navigation';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-1 text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Page not found
      </h2>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-dark text-light dark:bg-light dark:text-dark rounded-md px-6 py-2 text-sm transition-opacity hover:opacity-80"
      >
        Go home
      </Link>
    </div>
  );
}
