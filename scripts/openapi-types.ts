import { spawnSync } from 'node:child_process';

/**
 * Generate TypeScript types from the API's OpenAPI document.
 *
 *   OPENAPI_SPEC=https://api.example.com/openapi.json pnpm api:types
 *   pnpm api:types ./openapi.json
 *
 * Output lands in `src/types/api.generated.d.ts`; import request and
 * response shapes from there and keep zod schemas in `api/schema.ts` for the
 * runtime checks the type system cannot do.
 */
const spec = process.argv[2] ?? process.env.OPENAPI_SPEC;
if (!spec) {
  console.error('Pass the OpenAPI document as an argument or set OPENAPI_SPEC.');
  process.exit(1);
}

const result = spawnSync(
  'openapi-typescript',
  [spec, '--output', 'src/types/api.generated.d.ts', '--root-types', '--alphabetize'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
