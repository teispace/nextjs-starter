# Internationalization

next-intl 4 on the App Router. The locale is a root param, so pages and layouts need no per-file ceremony to stay static.

```
src/i18n/
├── routing.ts        locales, defaultLocale, localePrefix (reads src/lib/config/app-locales.ts)
├── request.ts        resolves the locale from next/root-params, loads messages, timeZone, formats
├── formats.ts        shared dateTime / number / list formats
├── navigation.ts     locale-aware Link, redirect, useRouter, usePathname, getPathname
└── translations/
    └── en.json
```

Types (`SupportedLocale`, `AppLocale`, `LocaleDirection`) and the `AppConfig` augmentation that types `Messages` and `Formats` live in `src/types/i18n.ts`.

## Using translations

Server Components:

```tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('Account');
  return <h1>{t('dashboardTitle')}</h1>;
}
```

Client Components get the messages from `RootProvider`:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function SignOutButton() {
  const t = useTranslations('Account');
  return <button type="button">{t('signOut')}</button>;
}
```

Passing translated strings down from a Server Component as props is still the cheapest option when a client leaf only needs a label.

## Static rendering

Nothing to do per page. `src/i18n/request.ts` reads the locale with `rootParams` (`next/root-params`), validates it against `routing.locales`, and calls `notFound()` for anything else. `generateStaticParams` in `src/app/[locale]/layout.tsx` lists the locales once. Pages stay in the static shell unless they read request data; under Cache Components that work belongs under `<Suspense>`.

Do not call `setRequestLocale`; it is deprecated in next-intl 4 and unnecessary here.

## Metadata

```tsx
export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('App')]);
  return generateSEOMetadata({ title: t('title'), description: t('description'), path: '/', locale });
}
```

`generateSEOMetadata` (`@/lib/config/seo`) adds canonical and hreflang URLs, Open Graph, Twitter, and robots directives.

## Navigation

```tsx
import { Link, useRouter } from '@/i18n/navigation';

<Link href={AppPaths.dashboard}>Dashboard</Link>;
router.replace(AppPaths.home);
```

Always import navigation from `@/i18n/navigation`, not from `next/link` or `next/navigation`, so locale prefixes are applied consistently.

## Formats

`src/i18n/formats.ts` defines named formats (`dateTime.short`, `number.currency`, `list.enumeration`). They are typed through `AppConfig`, so `format.dateTime(date, 'short')` autocompletes:

```tsx
import { useFormatter } from 'next-intl';
const format = useFormatter();
format.dateTime(new Date(), 'long');
format.number(12.5, 'percent');
```

The server-side time zone comes from `DEFAULT_TIMEZONE` so rendered dates match between server and client.

## Adding a locale

1. `cp src/i18n/translations/en.json src/i18n/translations/es.json` and translate.
2. Add the entry to `appLocales` in `src/lib/config/app-locales.ts` (name, flag, `ogLocale`, optional `dir: 'rtl'`).
3. Widen `SupportedLocale` in `src/types/i18n.ts`.
4. `pnpm build` prerenders `/es` and `/es/opengraph-image`.

## Message syntax

```json
{
  "greeting": "Hello, {name}!",
  "items": "{count, plural, =0 {No items} =1 {One item} other {# items}}",
  "terms": "Read the <link>terms</link>"
}
```

```tsx
t('greeting', { name });
t('items', { count });
t.rich('terms', { link: (chunks) => <Link href="/terms">{chunks}</Link> });
```

## Common issues

- **A page went dynamic**: it reads `cookies()`, `headers()`, or `searchParams` outside `<Suspense>`. Move that read into a small async component inside a boundary.
- **`notFound()` for a valid locale**: the locale is missing from `routing.locales` or `appLocales`.
- **Hydration mismatch on dates**: the client formats with a different time zone. Use `useFormatter` (it honours the server's `timeZone`) instead of `toLocaleString`.
