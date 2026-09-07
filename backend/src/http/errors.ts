import type { FastifyReply } from 'fastify';

/**
 * Forma `{ error }` en español. Es el contrato que ya consume
 * `frontend/src/lib/api.ts`, que muestra el mensaje tal cual al usuario.
 */
export function sendError(reply: FastifyReply, status: number, message: string): FastifyReply {
  return reply.status(status).send({ error: message });
}
