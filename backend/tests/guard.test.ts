import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { requireRole, requireSession } from '../src/auth/guard.js';
import type { OidcClient } from '../src/auth/oidc.js';
import { createSession, SESSION_COOKIE, TTL_CORTO_MS } from '../src/auth/session.js';
import { prisma, type Role } from '../src/db/prisma.js';
import { loadEnv } from '../src/env.js';
import { limpiarBase } from './db.js';

const env = loadEnv({
  // Sin esto, NODE_ENV cae en 'development' y Fastify escupe logs JSON de cada
  // request en la salida de los tests. La salida tiene que quedar limpia.
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL,
  APP_ORIGIN: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  SESSION_COOKIE_SECRET: 'x'.repeat(32),
});

const oidcNoUsado: OidcClient = {
  buildAuthUrl: () => new URL('https://accounts.google.com'),
  exchange: async () => {
    throw new Error('no se usa en este test');
  },
};

async function appDePrueba(): Promise<FastifyInstance> {
  const app = await buildApp({ env, oidc: oidcNoUsado });
  app.get('/privado', { preHandler: requireSession }, async (request) => ({
    email: request.user!.email,
  }));
  app.post('/solo-admin', { preHandler: [requireSession, requireRole('ADMIN')] }, async () => ({
    ok: true,
  }));
  return app;
}

async function usuarioConSesion(role: Role) {
  const usuario = await prisma.user.create({
    data: { email: `${role.toLowerCase()}@5848motors.com`, name: role, role, status: 'ACTIVE' },
  });
  const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
  return { usuario, cookie: `${SESSION_COOKIE}=${token}` };
}

describe('guards', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sin cookie devuelve 401', async () => {
    const app = await appDePrueba();
    const r = await app.inject({ method: 'GET', url: '/privado' });
    expect(r.statusCode).toBe(401);
    expect(r.json().error).toMatch(/sesión/i);
    await app.close();
  });

  it('con una cookie inventada devuelve 401', async () => {
    const app = await appDePrueba();
    const r = await app.inject({
      method: 'GET',
      url: '/privado',
      headers: { cookie: `${SESSION_COOKIE}=inventado` },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('con sesión válida deja pasar y expone el usuario', async () => {
    const app = await appDePrueba();
    const { cookie } = await usuarioConSesion('EDITOR');

    const r = await app.inject({ method: 'GET', url: '/privado', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.json().email).toBe('editor@5848motors.com');
    await app.close();
  });

  it('un EDITOR no entra a una ruta de ADMIN', async () => {
    const app = await appDePrueba();
    const { cookie } = await usuarioConSesion('EDITOR');

    const r = await app.inject({ method: 'POST', url: '/solo-admin', headers: { cookie } });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('un VIEWER no entra a una ruta de ADMIN', async () => {
    const app = await appDePrueba();
    const { cookie } = await usuarioConSesion('VIEWER');

    const r = await app.inject({ method: 'POST', url: '/solo-admin', headers: { cookie } });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('un ADMIN entra', async () => {
    const app = await appDePrueba();
    const { cookie } = await usuarioConSesion('ADMIN');

    const r = await app.inject({ method: 'POST', url: '/solo-admin', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    await app.close();
  });
});
