import { z } from 'zod';

import { WS_DISCONNECT_REASON, type WsDisconnectReason } from './disconnect-reason';

/**
 * Runtime schemas for the server-originated lifecycle payloads (`error`,
 * `auth:error`, `auth:force:disconnect`). The socket carries untrusted bytes
 * off the wire; parsing them before they reach Redux matches the project's
 * zod-at-boundaries convention and prevents a malformed payload from producing
 * `undefined` slice state.
 */

export const wsErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  errors: z.array(z.record(z.string(), z.string())).optional(),
  stack: z.string().optional(),
});

const reasonValues = Object.values(WS_DISCONNECT_REASON) as [
  WsDisconnectReason,
  ...WsDisconnectReason[],
];

export const wsForceDisconnectPayloadSchema = z.object({
  reason: z.enum(reasonValues),
  reconnectable: z.boolean().optional(),
});
