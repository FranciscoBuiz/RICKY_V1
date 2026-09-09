import { createHash, randomBytes } from 'node:crypto';
import { prisma, type Role, type UserStatus } from '../db/prisma.js';

export const SESSION_COOKIE = 'motors_session';

export const TTL_CORTO_MS = 12 * 60 * 60 * 1000; // 12 horas
export const TTL_LARGO_MS = 30 * 24 * 60 * 60 * 1000; // 30 días, con "recordarme"

/** Ventana mínima entre renovaciones: sin esto, cada request sería un UPDATE. */
const VENTANA_RENOVACION_MS = 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}

/** 256 bits. La cookie lleva esto; la base, solo su hash. */
function generarToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashear(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Devuelve el token en crudo: es la única vez que existe fuera del navegador. */
export async function createSession(input: {
  userId: string;
  ttlMs: number;
  userAgent?: string;
  ip?: string;
}): Promise<string> {
  const token = generarToken();
  const ahora = new Date();

  await prisma.session.create({
    data: {
      tokenHash: hashear(token),
      userId: input.userId,
      ttlMs: input.ttlMs,
      createdAt: ahora,
      lastSeenAt: ahora,
      expiresAt: new Date(ahora.getTime() + input.ttlMs),
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    },
  });

  return token;
}

/**
 * Devuelve el usuario si la sesión sirve, o `null`. Renueva la expiración de
 * forma deslizante, pero como mucho una vez por hora.
 */
export async function resolveSession(
  token: string,
  ahora: Date = new Date(),
): Promise<SessionUser | null> {
  const sesion = await prisma.session.findUnique({
    where: { tokenHash: hashear(token) },
    include: { user: true },
  });

  if (!sesion) return null;
  if (sesion.revokedAt) return null;
  if (sesion.expiresAt <= ahora) return null;
  if (sesion.user.status !== 'ACTIVE') return null;

  if (ahora.getTime() - sesion.lastSeenAt.getTime() >= VENTANA_RENOVACION_MS) {
    await prisma.session.update({
      where: { id: sesion.id },
      // La columna es BIGINT porque el TTL de "recordarme" (30 días en ms) no
      // entra en un INTEGER de Postgres; acá vuelve a ser number para la fecha.
      data: { lastSeenAt: ahora, expiresAt: new Date(ahora.getTime() + Number(sesion.ttlMs)) },
    });
  }

  return {
    id: sesion.user.id,
    name: sesion.user.name,
    email: sesion.user.email,
    role: sesion.user.role as Role,
    status: sesion.user.status as UserStatus,
  };
}

/** Idempotente: revocar algo inexistente no es un error. */
export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: hashear(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Se usa al borrar o degradar a alguien: no puede seguir adentro. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
