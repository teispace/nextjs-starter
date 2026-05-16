# 🌍 Internationalization (i18n) Guide

Quick reference for using **next-intl** in this project.

---

## 📁 Structure

```
src/i18n/
├── routing.ts          # Route config (locales, defaultLocale, localePrefix)
├── request.ts          # Server-side config (loads translations, reads timeZone from env)
├── navigation.ts       # Locale-aware Link, redirect, useRouter
└── translations/
    └── en.json         # Translation files
```

Locale types (`SupportedLocale`, `AppLocale`, `LocaleDirection`) live in `src/types/i18n.ts` alongside the `next-intl` `AppConfig` module augmentation. The list of locales and their metadata lives in `src/lib/config/app-locales.ts` — `routing.ts` reads from there.

---

## 📝 How to Use Translations

### In Server Components (Recommended)

**Non-async:**

```tsx
import { useTranslations } from 'next-intl';

export default function UserProfile() {
  const t = useTranslations('UserProfile');
  return <h2>{t('title')}</h2>;
}
```

**Async (for data fetching):**

```tsx
import { getTranslations } from 'next-intl/server';

export default async function ProfilePage() {
  const t = await getTranslations('ProfilePage');
  return <h1>{t('title')}</h1>;
}
```

### In Client Components

**Option 1: Pass from Server (Best)**

```tsx
// Server: Translate and pass as props
import { useTranslations } from 'next-intl';
import ClientButton from './ClientButton';

export default function FAQ() {
  const t = useTranslations('FAQ');
  return <ClientButton label={t('submit')} />;
}
```

**Option 2: Use All Messages (Already Setup)**

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function ClientComponent() {
  const t = useTranslations('SomeNamespace');
  return <div>{t('message')}</div>;
}
```

---

## 🎯 Static Rendering (SSG)

**Required in EVERY page/layout:**

```tsx
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

// 1. Export this
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // 2. Call BEFORE using translations
  setRequestLocale(locale as 'en');

  // 3. Now use translations
  const t = await getTranslations('PageName');
  return <h1>{t('title')}</h1>;
}
```

**Verify static build:**

```bash
yarn build
# Look for: ● /[locale] (not ƒ)
```

---

## 🔧 Navigation

Use locale-aware navigation APIs:

```tsx
import { Link, useRouter } from '@/i18n/navigation';

function Nav() {
  const router = useRouter();

  return (
    <>
      <Link href="/about">About</Link>
      <button onClick={() => router.push('/contact')}>Go</button>
    </>
  );
}
```

---

## 🌐 Adding New Locale

**1. Create translation file:**

```bash
cp src/i18n/translations/en.json src/i18n/translations/es.json
```

**2. Update types:**

```ts
// src/types/i18n.ts
export type SupportedLocale = 'en' | 'es';
```

**3. Update app locales:**

```ts
// src/lib/config/app-locales.ts
export const appLocales: AppLocale[] = [
  { name: 'English', locale: 'en', flag: '🇺🇸', country: 'United States' },
  { name: 'Español', locale: 'es', flag: '🇪🇸', country: 'Spain' },
];
```

**4. Update routing:**

```ts
// src/i18n/routing.ts
locales: ['en', 'es'];
```

**5. Build:**

```bash
yarn build
```

---

## 📝 Translation Syntax

**Variables:**

```json
{ "greeting": "Hello, {name}!" }
```

```tsx
t('greeting', { name: 'John' }); // "Hello, John!"
```

**Plurals:**

```json
{ "items": "{count, plural, =0 {No items} =1 {One item} other {# items}}" }
```

**Rich Text:**

```tsx
t.rich('terms', {
  terms: (chunks) => <Link href="/terms">{chunks}</Link>,
});
```

**Formatting:**

```tsx
import { useFormatter } from 'next-intl';

const format = useFormatter();
format.dateTime(new Date(), { dateStyle: 'long' });
format.number(1234.56, { style: 'currency', currency: 'USD' });
```

---

## 🔍 Where to Use

### Metadata/SEO

```tsx
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('title') };
}
```

### Server Actions

```tsx
export async function submitForm(formData: FormData) {
  'use server';
  const t = await getTranslations('Forms');
  console.log(t('submitting'));
}
```

---

## ⚠️ Common Issues

**Build shows `ƒ` (dynamic) instead of `●` (static):**
- Missing `generateStaticParams()` export
- Missing `setRequestLocale(locale)` call

**TypeScript errors on locale:**
```tsx
setRequestLocale(locale as 'en');  // Cast it
````

**Client component can't access translations:**

- Pass as props from server (recommended)
- Or use the root provider (already setup)

---

## 📚 Resources

- [next-intl Docs](https://next-intl.dev)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)

---

**Versions are tracked in `package.json` — this guide targets `next-intl ^4.12` on Next 16.**
