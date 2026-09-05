'use client';

import { catchError, type ErrorInfo } from 'next/error';

import { logger } from '@/lib/logger';

interface SectionErrorBoundaryProps {
  /** Heading shown in place of the section. */
  title: string;
  /** Label of the retry button. */
  retryLabel: string;
}

/**
 * Component-level error boundary built on Next's `catchError`, for sections
 * that should fail on their own instead of taking the whole route down with
 * `error.tsx`. `retry()` re-renders the subtree inside a transition, so
 * state elsewhere on the page survives; `redirect()` and `notFound()` pass
 * through untouched. The raw message is never shown: it can carry internals.
 */
function SectionErrorFallback({ title, retryLabel }: SectionErrorBoundaryProps, info: ErrorInfo) {
  const error = info.error instanceof Error ? info.error : new Error(String(info.error));
  const digest = (error as { digest?: string }).digest;
  logger.error({ err: error, digest }, 'Section failed to render');
  return (
    <div role="alert" className="flex flex-col items-center gap-2 text-center">
      <p className="font-medium text-sm">{title}</p>
      <button
        type="button"
        onClick={() => info.retry()}
        className="cursor-pointer rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
      >
        {retryLabel}
      </button>
    </div>
  );
}

export const SectionErrorBoundary = catchError(SectionErrorFallback);
