// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { breadcrumbJsonLd, JsonLd, serializeJsonLd, websiteJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('escapes sequences that could close the script block', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script>');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});

describe('JsonLd', () => {
  it('renders a schema.org graph in a data block', () => {
    const { container } = render(
      <JsonLd data={[websiteJsonLd(), breadcrumbJsonLd([{ name: 'Home', path: '/' }])]} />,
    );
    const script = container.getElementsByTagName('script')[0];
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    const parsed = JSON.parse(script?.textContent ?? '');
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@graph'][0]['@type']).toBe('WebSite');
    expect(parsed['@graph'][1].itemListElement[0].position).toBe(1);
  });
});
