'use client';

import { useTranslations } from 'next-intl';

import { useAction } from 'next-safe-action/hooks';

import { useRouter } from '@/i18n/navigation';
import { AppPaths } from '@/lib/config/app-paths';

import { signOut } from '../api/actions';

export function SignOutButton() {
  const t = useTranslations('Account');
  const router = useRouter();
  const { execute, isPending, result } = useAction(signOut, {
    onSuccess: () => router.replace(AppPaths.home),
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => execute()}
        disabled={isPending}
        className="cursor-pointer rounded-md bg-dark px-6 py-2 text-light text-sm transition-opacity hover:opacity-80 disabled:cursor-progress disabled:opacity-60 dark:bg-light dark:text-dark"
      >
        {isPending ? t('signingOut') : t('signOut')}
      </button>
      {result.serverError ? (
        <p role="alert" className="text-red-600 text-sm dark:text-red-400">
          {result.serverError.message}
        </p>
      ) : null}
    </div>
  );
}
