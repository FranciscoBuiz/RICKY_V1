import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireRole, requireSession } from '../auth/guard.js';
import { revokeAllSessions } from '../auth/session.js';
import { prisma } from '../db/prisma.js';
import { sendError } from '../http/errors.js';
import { findByEmail, inviteUser, listUsers, toPanelUser } from './repo.js';
import { ROL_POR_CLAVE } from './roles.js';

const soloAdmin = { preHandler: [requireSession, requireRole('ADMIN')] };

const invitacionSchema = z.object({
  email: z.email('Ingresá un email válido.'),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
});

const cambioSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  status: z.enum(['active', 'pending']).optional(),
});

export function registerUserRoutes(app: FastifyInstance): void {
  app.get('/users', soloAdmin, async () => ({ users: await listUsers() }));

  app.post('/users', soloAdmin, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = invitacionSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos.');
    }

    if (await findByEmail(parsed.data.email)) {
      return sendError(reply, 409, 'Ese email ya tiene acceso al panel.');
    }

    const usuario = await inviteUser(parsed.data.email, ROL_POR_CLAVE[parsed.data.role]!);
    return reply.status(201).send({ user: usuario });
  });

  app.patch('/users/:id', soloAdmin, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const parsed = cambioSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, 'Datos inválidos.');

    const objetivo = await prisma.user.findUnique({ where: { id } });
    if (!objetivo) return sendError(reply, 404, 'Ese usuario no existe.');

    // Sin esto el último administrador puede dejarse afuera y nadie puede volver a entrar.
    if (objetivo.id === request.user!.id && parsed.data.role && parsed.data.role !== 'admin') {
      return sendError(reply, 409, 'No podés quitarte a vos mismo el rol de administrador.');
    }

    const actualizado = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.role ? { role: ROL_POR_CLAVE[parsed.data.role]! } : {}),
        ...(parsed.data.status
          ? { status: parsed.data.status === 'active' ? 'ACTIVE' : 'PENDING' }
          : {}),
      },
    });

    // Bajar el rol o suspender no puede dejar viva una sesión con permisos viejos.
    await revokeAllSessions(id);

    return { user: toPanelUser(actualizado) };
  });

  app.delete('/users/:id', soloAdmin, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    if (id === request.user!.id) {
      return sendError(reply, 409, 'No podés borrarte a vos mismo.');
    }

    const objetivo = await prisma.user.findUnique({ where: { id } });
    if (!objetivo) return sendError(reply, 404, 'Ese usuario no existe.');

    // El onDelete: Cascade del esquema se lleva sus sesiones.
    await prisma.user.delete({ where: { id } });

    return reply.status(204).send();
  });
}
