import { ImageResponse } from 'next/og';

import { APP_NAME } from '@/lib/config/seo';

// Default Open Graph card for every route. Pages that pass `image` to
// `generateSEOMetadata` override it; everything else inherits this file.
export const alt = APP_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: 80,
        background: 'linear-gradient(135deg, #202938 0%, #0f141b 100%)',
        color: '#f5f5f5',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>{APP_NAME}</div>
      <div style={{ marginTop: 16, fontSize: 36, opacity: 0.75 }}>
        Next.js 16 · TypeScript · Tailwind v4
      </div>
    </div>,
    size,
  );
}
