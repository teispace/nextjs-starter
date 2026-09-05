import { createElement } from 'react';

import { ImageResponse } from 'next/og.js';

import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Renders the app icons once into `src/app/` so Next serves them as static
 * metadata files (`/icon.png`, `/apple-icon.png`) with no request-time work.
 *
 *   pnpm icons                # letter from the package name
 *   pnpm icons --label TS     # custom label
 *
 * Replace the output with real artwork whenever you have it; this exists so
 * a fresh project never ships without icons.
 */
const args = process.argv.slice(2);
const labelIndex = args.indexOf('--label');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { name?: string };
const label =
  labelIndex !== -1 && args[labelIndex + 1]
    ? String(args[labelIndex + 1])
    : (pkg.name ?? 'app')
        .replace(/^@[^/]+\//, '')
        .charAt(0)
        .toUpperCase();

const render = async (size: number, radius: number, output: string) => {
  const response = new ImageResponse(
    createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #202938 0%, #0f141b 100%)',
          color: '#f5f5f5',
          borderRadius: radius,
          fontFamily: 'sans-serif',
          fontSize: Math.round(size * 0.58),
          fontWeight: 700,
          letterSpacing: -2,
        },
      },
      label,
    ),
    { width: size, height: size },
  );
  writeFileSync(output, Buffer.from(await response.arrayBuffer()));
  console.log(`✓ ${output} (${size}×${size})`);
};

// Maskable icons need the artwork to fill the canvas; iOS applies its own mask.
await render(512, 0, 'src/app/icon.png');
await render(180, 0, 'src/app/apple-icon.png');
