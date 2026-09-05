import { describe, expect, it } from 'vitest';

import manifest from '../next-maker.json';

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'coverage', 'playwright-report']);

/**
 * Manifest patterns are literal paths plus `*` (one segment) and `**`
 * (any depth). Brackets, parentheses, and dots are literal, so App Router
 * paths like `src/app/[locale]/(app)/**` need no escaping. Dot-directories
 * match like any other. The CLI applies the same rule.
 */
const patternToRegExp = (pattern: string): RegExp => {
  let out = '^';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') {
          i++;
          out += '(?:.*/)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else {
      out += ch?.replace(/[.+?^${}()|[\]\\]/g, '\\$&') ?? '';
    }
  }
  return new RegExp(`${out}$`);
};

const listFiles = async (): Promise<string[]> => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .filter((file) => !file.split(path.sep).some((segment) => SKIP_DIRS.has(segment)))
    .map((file) => file.split(path.sep).join('/'));
};

const allFiles = await listFiles();
const matches = (pattern: string): string[] => {
  const re = patternToRegExp(pattern);
  return allFiles.filter((file) => re.test(file));
};

type Variant = {
  remove?: string[];
  overlay?: string;
  anchors?: string[];
  unwrapJsx?: { file: string; tag: string }[];
  unwrapCall?: { file: string; name: string }[];
  packages?: string[];
  devPackages?: string[];
  scripts?: string[];
  env?: string[];
};
type Feature = { when: Record<string, unknown[]>; on?: Variant; off?: Variant };

const features = manifest.features as Record<string, Feature>;
const variants = Object.entries(features).flatMap(([id, feature]) =>
  (['on', 'off'] as const)
    .filter((k) => feature[k])
    .map((k) => [`${id}.${k}`, feature[k] as Variant] as const),
);

const ANCHOR_EXTENSIONS = ['.ts', '.tsx', '.css', '.yml', '.yaml', '.example'];
const anchorCarriers = (): string[] =>
  allFiles.filter(
    (file) =>
      ANCHOR_EXTENSIONS.some((ext) => file.endsWith(ext)) ||
      (file.startsWith('.husky/') && !file.startsWith('.husky/_/')),
  );

describe('next-maker.json', () => {
  it('carries the package version', async () => {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(manifest.starter.version).toBe(pkg.version);
  });

  it('matches literal App Router paths and dot-directories', () => {
    expect(patternToRegExp('src/app/[locale]/**').test('src/app/[locale]/(app)/page.tsx')).toBe(
      true,
    );
    expect(patternToRegExp('src/app/[locale]/**').test('src/app/locale/page.tsx')).toBe(false);
    expect(patternToRegExp('**/*.test.ts').test('src/a/b.test.ts')).toBe(true);
    expect(patternToRegExp('**/*.test.ts').test('b.test.ts')).toBe(true);
    expect(patternToRegExp('.github/workflows/**').test('.github/workflows/ci.yml')).toBe(true);
    expect(patternToRegExp('Dockerfile').test('Dockerfile')).toBe(true);
    expect(patternToRegExp('Dockerfile').test('x/Dockerfile')).toBe(false);
  });

  it('references only options that exist, with valid values', () => {
    const options = manifest.options as Record<string, { values?: unknown[]; type: string }>;
    for (const [id, feature] of Object.entries(features)) {
      for (const [option, values] of Object.entries(feature.when)) {
        const spec = options[option];
        expect(spec, `${id}.when refers to unknown option ${option}`).toBeDefined();
        if (spec.type === 'boolean') {
          for (const v of values) expect(typeof v, `${id}.when.${option}`).toBe('boolean');
        } else {
          for (const v of values) expect(spec.values, `${id}.when.${option}`).toContain(v);
        }
      }
    }
  });

  it('removes only paths that exist in the starter', async () => {
    const patterns = [
      ...manifest.always.remove,
      ...variants.flatMap(([, v]) => v.remove ?? []),
      ...Object.values(manifest.packageManagers).flatMap((pm) => ('remove' in pm ? pm.remove : [])),
    ];
    for (const pattern of new Set(patterns)) {
      expect(matches(pattern).length, `nothing matches ${pattern}`).toBeGreaterThan(0);
    }
  });

  it('points every overlay at an existing directory with files', async () => {
    const overlays = [
      ...variants.flatMap(([, v]) => (v.overlay ? [v.overlay] : [])),
      ...Object.values(manifest.packageManagers).flatMap((pm) =>
        'overlay' in pm ? [pm.overlay] : [],
      ),
    ];
    for (const overlay of new Set(overlays)) {
      const files = matches(`.next-maker/overlays/${overlay}/**`);
      expect(files.length, `overlay ${overlay} is empty`).toBeGreaterThan(0);
    }
  });

  it('has at least one anchor in the tree for every anchor id it strips', async () => {
    const ids = new Set(variants.flatMap(([, v]) => v.anchors ?? []));
    const contents = await Promise.all(
      anchorCarriers().map((f) => readFile(path.join(root, f), 'utf8')),
    );
    const all = contents.join('\n');
    for (const id of ids) {
      expect(all.includes(`@next-maker:${id}`), `no anchor for ${id}`).toBe(true);
    }
  });

  it('balances every start anchor with an end anchor in every file', async () => {
    for (const file of anchorCarriers()) {
      const content = await readFile(path.join(root, file), 'utf8');
      const starts = content.match(/@next-maker:[\w-]+:start/g) ?? [];
      const ends = content.match(/@next-maker:[\w-]+:end/g) ?? [];
      expect(ends.length, `unbalanced anchors in ${file}`).toBe(starts.length);
    }
  });

  it('names only packages and scripts that package.json declares', async () => {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    for (const [id, v] of variants) {
      for (const name of v.packages ?? []) {
        expect(pkg.dependencies[name], `${id}: ${name} not in dependencies`).toBeDefined();
      }
      for (const name of v.devPackages ?? []) {
        expect(pkg.devDependencies[name], `${id}: ${name} not in devDependencies`).toBeDefined();
      }
      for (const name of v.scripts ?? []) {
        expect(pkg.scripts[name], `${id}: script ${name} missing`).toBeDefined();
      }
    }
    for (const step of manifest.validateScript.steps) {
      expect(pkg.scripts[step], `validate step ${step} missing`).toBeDefined();
    }
  });
});
