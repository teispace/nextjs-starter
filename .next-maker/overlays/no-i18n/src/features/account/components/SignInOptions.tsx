'use client';

import { useSignInCapabilities } from '../api/queries';
import type { SignInProvider } from '../api/schema';

const PROVIDER_LABEL: Record<SignInProvider, string> = {
  password: 'Password',
  'magic-link': 'Magic link',
  google: 'Google',
  github: 'GitHub',
};

/**
 * Reads hydrated query data: the page prefetches on the server and this
 * component renders synchronously on the client with no loading state.
 */
export function SignInOptions() {
  const { data } = useSignInCapabilities();

  return (
    <section aria-labelledby="sign-in-options" className="flex flex-col items-center gap-2">
      <h2 id="sign-in-options" className="font-medium text-sm">
        Sign in with
      </h2>
      <ul className="flex flex-wrap justify-center gap-2">
        {data.providers.map((provider) => (
          <li
            key={provider}
            className="rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
          >
            {PROVIDER_LABEL[provider]}
          </li>
        ))}
      </ul>
      {data.allowSignUp ? (
        <p className="text-gray-500 text-xs dark:text-gray-400">New accounts can be created.</p>
      ) : null}
    </section>
  );
}
