import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createSession,
  resolveSession,
  revokeAllSessions,
  revokeSession,
  TTL_CORTO_MS,
} from '../src/auth/session.js';
import { prisma } from '../src/db/prisma.js';
import { limpiarBase } from './db.js';

async function crearUsuario() {
  return prisma.user.create({
    data: { email: 'jefe@5848motors.com', name: 'Jefe', role: 'ADMIN', status: 'ACTIVE' },
  });
}

describe('sesiones', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('resuelve una sesión recién creada', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    const sesion = await resolveSession(token);
    expect(sesion?.id).toBe(usuario.id);
    expect(sesion?.role).toBe('ADMIN');
  });

  it('nunca guarda el token en crudo', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    const fila = await prisma.session.findFirst();
    expect(fila?.tokenHash).not.toBe(token);
    expect(fila?.tokenHash).toHaveLength(64);
  });

  it('rechaza un token inexistente', async () => {
    expect(await resolveSession('token-inventado')).toBeNull();
  });

  it('rechaza una sesión expirada', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    const futuro = new Date(Date.now() + TTL_CORTO_MS + 1000);
    expect(await resolveSession(token, futuro)).toBeNull();
  });

  it('rechaza una sesión revocada', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    await revokeSession(token);
    expect(await resolveSession(token)).toBeNull();
  });

  it('rechaza la sesión de un usuario que volvió a PENDING', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    await prisma.user.update({ where: { id: usuario.id }, data: { status: 'PENDING' } });
    expect(await resolveSession(token)).toBeNull();
  });

  it('rechaza la sesión de un usuario borrado', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    await prisma.user.delete({ where: { id: usuario.id } });
    expect(await resolveSession(token)).toBeNull();
  });

  it('no renueva la expiración antes de la hora', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
    const antes = await prisma.session.findFirst();

    await resolveSession(token, new Date(Date.now() + 30 * 60 * 1000));

    const despues = await prisma.session.findFirst();
    expect(despues?.expiresAt.getTime()).toBe(antes?.expiresAt.getTime());
  });

  it('renueva la expiración pasada la hora', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
    const antes = await prisma.session.findFirst();

    await resolveSession(token, new Date(Date.now() + 61 * 60 * 1000));

    const despues = await prisma.session.findFirst();
    expect(despues!.expiresAt.getTime()).toBeGreaterThan(antes!.expiresAt.getTime());
  });

  it('revokeAllSessions corta todas las del usuario', async () => {
    const usuario = await crearUsuario();
    const uno = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
    const dos = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    await revokeAllSessions(usuario.id);

    expect(await resolveSession(uno)).toBeNull();
    expect(await resolveSession(dos)).toBeNull();
  });
});
