import type { core, ZodType } from 'zod';

type Issue = core.$ZodIssue;

/** Format zod issues as one bullet per line for readable terminal output. */
export function formatIssues(issues: Issue[]): string {
  return issues
    .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

/**
 * Validate a config object against a zod schema. Throws with a pretty
 * multi-line error listing every failed field when invalid.
 */
export function validateConfig<T>(
  schema: ZodType<T>,
  config: Record<string, unknown>,
  label = 'environment variables',
): T {
  const parsed = schema.safeParse(config);

  if (!parsed.success) {
    throw new Error(
      `Invalid ${label}:\n${formatIssues(parsed.error.issues)}\n\n` +
        `Fix .env (or the relevant source) and retry.`,
    );
  }

  return parsed.data;
}
