'use client';

import { useTranslations } from 'next-intl';

import { useSignInCapabilities } from '../api/queries';
import type { SignInProvider } from '../api/schema';

const PROVIDER_LABEL_KEY: Record<SignInProvider, 'password' | 'magicLink' | 'google' | 'github'> = {
  password: 'password',
  'magic-link': 'magicLink',
  google: 'google',
  github: 'github',
};

/**
 * Reads hydrated query data: the page prefetches on the server and this
 * component renders synchronously on the client with no loading state.
 */
export function SignInOptions() {
  const t = useTranslations('Account');
  const { data } = useSignInCapabilities();

  return (
    <section aria-labelledby="sign-in-options" className="flex flex-col items-center gap-2">
      <h2 id="sign-in-options" className="font-medium text-sm">
        {t('signInWith')}
      </h2>
      <ul className="flex flex-wrap justify-center gap-2">
        {data.providers.map((provider) => (
          <li
            key={provider}
            className="rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
          >
            {t(`providers.${PROVIDER_LABEL_KEY[provider]}`)}
          </li>
        ))}
      </ul>
      {data.allowSignUp ? (
        <p className="text-gray-500 text-xs dark:text-gray-400">{t('signUpOpen')}</p>
      ) : null}
    </section>
  );
}
