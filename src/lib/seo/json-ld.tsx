import { APP_NAME, APP_URL } from '@/lib/config/seo';

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];
export interface JsonLdObject {
  [key: string]: JsonLdValue | undefined;
}
export type JsonLdThing = JsonLdObject & { '@type': string };

/**
 * Serialise structured data for a `<script type="application/ld+json">`.
 * `<` is escaped so a value containing `</script>` cannot close the block:
 * JSON-LD is HTML-embedded data, and this is the documented safe encoding.
 */
export const serializeJsonLd = (data: JsonLdObject | JsonLdObject[]): string =>
  JSON.stringify(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');

/**
 * Renders one or more schema.org objects. Server Component friendly, no
 * client JavaScript, ignored by CSP (data blocks are not executed).
 */
export const JsonLd = ({ data }: { data: JsonLdThing | JsonLdThing[] }) => {
  const graph = Array.isArray(data) ? data : [data];
  const payload = { '@context': 'https://schema.org', '@graph': graph };
  const html = { __html: serializeJsonLd(payload) };
  // biome-ignore lint/security/noDangerouslySetInnerHtml: serialised JSON-LD with `<` escaped
  return <script type="application/ld+json" dangerouslySetInnerHTML={html} />;
};

export const websiteJsonLd = (overrides: JsonLdObject = {}): JsonLdThing => ({
  '@type': 'WebSite',
  name: APP_NAME,
  url: APP_URL,
  ...overrides,
});

export const organizationJsonLd = (overrides: JsonLdObject = {}): JsonLdThing => ({
  '@type': 'Organization',
  name: APP_NAME,
  url: APP_URL,
  logo: `${APP_URL}/icon.png`,
  ...overrides,
});

export const breadcrumbJsonLd = (items: { name: string; path: string }[]): JsonLdThing => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${APP_URL}${item.path}`,
  })),
});
