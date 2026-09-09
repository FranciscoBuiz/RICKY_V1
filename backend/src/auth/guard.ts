import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { Role } from '../db/prisma.js';
import { sendError } from '../http/errors.js';
import { resolveSession, SESSION_COOKIE, type SessionUser } from './session.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

/** Traduce la cookie a `request.user`. Es el único punto que lee la cookie. */
export const requireSession: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) {
    return sendError(reply, 401, 'Necesitás iniciar sesión.');
  }

  const usuario = await resolveSession(token);
  if (!usuario) {
    // Cookie vencida, revocada o de un usuario que ya no está: que el navegador la tire.
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return sendError(reply, 401, 'Tu sesión expiró. Volvé a iniciar sesión.');
  }

  request.user = usuario;
};

/** Va siempre después de `requireSession`. */
export function requireRole(...roles: Role[]): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return sendError(reply, 401, 'Necesitás iniciar sesión.');
    }
    if (!roles.includes(request.user.role)) {
      return sendError(reply, 403, 'No tenés permisos para hacer esto.');
    }
  };
}
