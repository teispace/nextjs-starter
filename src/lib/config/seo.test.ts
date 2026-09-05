import { describe, expect, it } from 'vitest';

import { generateSEOMetadata } from './seo';

describe('generateSEOMetadata', () => {
  it('points at the unprefixed default card when no image is provided', () => {
    const meta = generateSEOMetadata({ title: 'Home', description: 'd', path: '/' });
    expect(meta.openGraph?.images).toEqual([
      { url: '/opengraph-image', width: 1200, height: 630, alt: 'Home' },
    ]);
    expect(meta.twitter?.images).toEqual(['/opengraph-image']);
    expect(meta.alternates?.canonical).toMatch(/\/$/);
  });

  it('uses the explicit image for both OpenGraph and Twitter when provided', () => {
    const meta = generateSEOMetadata({
      title: 'Post',
      description: 'd',
      path: '/post',
      image: 'https://cdn.example.com/post.png',
    });
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://cdn.example.com/post.png', width: 1200, height: 630, alt: 'Post' },
    ]);
    expect(meta.twitter?.images).toEqual(['https://cdn.example.com/post.png']);
  });

  it('marks noIndex pages as non-indexable', () => {
    const meta = generateSEOMetadata({ title: 'Login', description: 'd', noIndex: true });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
