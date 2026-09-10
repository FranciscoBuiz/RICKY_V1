import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { seedBootstrapAdmin, seedInvitedUser } from '../prisma/seed.js';
import { limpiarBase } from './db.js';

describe('seedBootstrapAdmin', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('crea el primer administrador como PENDING', async () => {
    await seedBootstrapAdmin('Jefe@5848motors.com');

    const usuario = await prisma.user.findUnique({ where: { email: 'jefe@5848motors.com' } });
    expect(usuario).not.toBeNull();
    expect(usuario?.role).toBe('ADMIN');
    expect(usuario?.status).toBe('PENDING');
    expect(usuario?.googleSub).toBeNull();
  });

  it('normaliza el email a minúsculas', async () => {
    await seedBootstrapAdmin('JEFE@5848MOTORS.COM');
    expect(await prisma.user.count({ where: { email: 'jefe@5848motors.com' } })).toBe(1);
  });

  it('es idempotente y no pisa un admin ya activo', async () => {
    await seedBootstrapAdmin('jefe@5848motors.com');
    await prisma.user.update({
      where: { email: 'jefe@5848motors.com' },
      data: { status: 'ACTIVE', googleSub: 'google-123', name: 'Jefe Real' },
    });

    await seedBootstrapAdmin('jefe@5848motors.com');

    const usuario = await prisma.user.findUnique({ where: { email: 'jefe@5848motors.com' } });
    expect(usuario?.status).toBe('ACTIVE');
    expect(usuario?.googleSub).toBe('google-123');
    expect(usuario?.name).toBe('Jefe Real');
    expect(await prisma.user.count()).toBe(1);
  });
});

describe('seedInvitedUser', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('crea el usuario invitado en PENDING, sin googleSub', async () => {
    await seedInvitedUser('invitado@example.com', 'EDITOR');

    const usuario = await prisma.user.findUnique({ where: { email: 'invitado@example.com' } });

    expect(usuario?.status).toBe('PENDING');
    expect(usuario?.role).toBe('EDITOR');
    expect(usuario?.googleSub).toBeNull();
  });

  it('es idempotente: corre en cada arranque del contenedor', async () => {
    await seedInvitedUser('invitado@example.com', 'EDITOR');
    await seedInvitedUser('invitado@example.com', 'EDITOR');

    const cuantos = await prisma.user.count({ where: { email: 'invitado@example.com' } });
    expect(cuantos).toBe(1);
  });
});
