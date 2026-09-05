import { spawnSync } from 'node:child_process';

// `next typegen` loads `next.config.ts`, which validates the environment.
// With NODE_ENV unset Next assumes production and every `devDefault`
// disappears, so a fresh clone cannot even type-check. Route types do not
// depend on the mode, so default to development unless the caller says
// otherwise (CI and `next build` set NODE_ENV themselves).
const env = { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' };

const result = spawnSync('next', ['typegen', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
