# SEO

Every page gets its metadata from one helper, so canonical URLs, language
alternates, social cards, and robots directives cannot drift apart page by
page.

## Every page

```tsx
import { generateSEOMetadata } from '@/lib/config/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('Invoices')]);
  return generateSEOMetadata({
    title: t('title'),
    description: t('description'),
    path: '/invoices',
    locale,
  });
}
```

| Parameter | Effect |
| :-- | :-- |
| `title`, `description` | The document title and description, and the same text in the Open Graph and Twitter cards. |
| `path` | The route without the locale segment. Everything else is derived from it. |
| `locale` | Selects the canonical URL and the Open Graph locale. |
| `image` | Overrides the social card for this page. |
| `noIndex` | Marks the page `noindex, nofollow`. |

What you get without asking: `metadataBase` from the public app URL, a
canonical URL, language alternates with `x-default` when the routing actually
distinguishes locales by URL, an Open Graph website card with a 1200×630
image, a `summary_large_image` Twitter card, and full-size preview
permissions for crawlers.

Pass `path` rather than building a URL. It keeps the canonical URL, the
alternates, and the Open Graph URL consistent, and it is the one input people
get wrong by hand.

## Dynamic pages

Metadata for a route with parameters reads them like any other request data:

```tsx
export async function generateMetadata({ params }: PageProps<'/[locale]/post/[slug]'>) {
  const { slug, locale } = await params;
  const post = await getPost(slug);           // cached DAL read
  if (!post) return generateSEOMetadata({ title: 'Not found', path: '/post', noIndex: true });

  return generateSEOMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/post/${slug}`,
    image: post.coverImage,
    locale,
  });
}
```

`generateMetadata` may read request data; the page body is what must stay
prerenderable. Read a param in the page itself only inside `<Suspense>`.

## Language alternates

`hreflang` only appears when it means something. With `localePrefix: 'never'`
every locale resolves to the same unprefixed URL, so emitting alternates
would advertise several URLs that are one page. Change the prefix strategy in
`src/i18n/routing.ts` and the alternates appear on their own.

## Structured data

JSON-LD helpers live in `@/lib/seo`. Render them from a Server Component; the
`JsonLd` component serializes safely, escaping the sequences that would let
content break out of the script tag.

```tsx
import { JsonLd, breadcrumbJsonLd, websiteJsonLd } from '@/lib/seo';

<JsonLd data={[websiteJsonLd(), breadcrumbJsonLd([
  { name: 'Home', path: '/' },
  { name: 'Invoices', path: '/invoices' },
])]} />
```

`websiteJsonLd` and `organizationJsonLd` take overrides, so site-wide values
are set once in the root layout. Add product, article, or FAQ objects by
building a `JsonLdThing` with the right `@type`; anything you emit should
describe content the page actually shows.

## Sitemap, robots, and the manifest

| File | Emits |
| :-- | :-- |
| `src/app/sitemap.ts` | `/sitemap.xml`. Add routes as you add sections, including one entry per locale when locales have distinct URLs. |
| `src/app/robots.ts` | `/robots.txt`, pointing at the sitemap. |
| `src/app/manifest.ts` | The web app manifest, sharing the app name, description, and theme colors. |

A sitemap that lists pages nobody can reach is worse than no sitemap. Generate
entries from the same source as your navigation where you can.

## Social images

`src/app/[locale]/opengraph-image.tsx` renders the default card at build time
with the framework's image response. It is referenced explicitly as
`/opengraph-image` rather than left to the file convention, because with an
unprefixed locale strategy the convention would emit a prefixed URL that then
redirects, and some crawlers do not follow it.

Override per page with `image`. A page-specific card is worth it for content
people share; it is not worth it for a settings screen.

## Checklist before launch

- `NEXT_PUBLIC_APP_URL` is the real public origin. Every canonical URL,
  alternate, and social image is built from it, and a production build
  refuses to start without it.
- Titles and descriptions come from translations, not hard-coded English.
- Pages that should not be indexed pass `noIndex`, including anything behind
  authentication.
- The sitemap lists what exists, and `robots.txt` points at it.
- The social card renders: open `/opengraph-image` directly and look.
