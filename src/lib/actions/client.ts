import { createSafeActionClient, returnServerError } from 'next-safe-action';
import { z } from 'zod';

import { hasEveryPermission, hasRole } from '@/lib/auth/authorize';
import { getCurrentUser } from '@/lib/auth/session';
import { generateRequestId } from '@/lib/http/shared';
import { logger } from '@/lib/logger';

import { ACTION_ERROR_CODE, type ActionError, actionError, toActionError } from './errors';

/**
 * Typed Server Action clients.
 *
 * `actionClient` validates input with the schema given to `.inputSchema()`,
 * logs every call with a request id and duration, and turns thrown errors
 * into the plain `ActionError` shape so nothing internal leaks to the browser.
 *
 * `authActionClient` additionally loads the session and refuses to run the
 * action when there is none. Every mutation that touches user data must use
 * it: an action is a public endpoint, and the check has to happen inside the
 * action, not in a layout or the proxy.
 *
 * ```ts
 * export const renameProject = authActionClient
 *   .metadata({ name: 'project.rename' })
 *   .inputSchema(z.object({ id: z.string(), name: z.string().min(1) }))
 *   .action(async ({ parsedInput, ctx }) => { ... ctx.user.id ... });
 * ```
 */
export const actionClient = createSafeActionClient({
  defineMetadataSchema: () =>
    z.object({
      name: z.string().min(1),
      /** Claims the caller must hold. Enforced by `authActionClient`. */
      roles: z.array(z.string()).optional(),
      permissions: z.array(z.string()).optional(),
    }),
  handleServerError: (error, { metadata }): ActionError => {
    const mapped = toActionError(error);
    logger.error(
      { err: error, action: metadata?.name, code: mapped.code, status: mapped.status },
      'Server action failed',
    );
    return mapped;
  },
}).use(async ({ next, metadata }) => {
  const requestId = generateRequestId();
  const startedAt = Date.now();
  const result = await next({ ctx: { requestId } });
  logger.info(
    { action: metadata.name, requestId, durationMs: Date.now() - startedAt, ok: result.success },
    'Server action',
  );
  return result;
});

export const authActionClient = actionClient.use(async ({ next, metadata }) => {
  const user = await getCurrentUser();
  if (!user) {
    returnServerError(actionError(ACTION_ERROR_CODE.UNAUTHENTICATED, 'Sign in to continue.', 401));
  }

  // Claims declared in `.metadata()` are checked here so the rule sits next to
  // the action's name rather than in its body. The API still enforces the real
  // one: this refuses the obviously wrong call and keeps the message honest.
  const { roles, permissions } = metadata;
  const allowed =
    (!roles || hasRole(user, ...roles)) &&
    (!permissions || hasEveryPermission(user, ...permissions));
  if (!allowed) {
    logger.warn(
      { action: metadata.name, userId: user.id, roles, permissions },
      'Server action refused: caller lacks the declared claims',
    );
    returnServerError(
      actionError(ACTION_ERROR_CODE.FORBIDDEN, 'You do not have access to do that.', 403),
    );
  }

  return next({ ctx: { user } });
});
