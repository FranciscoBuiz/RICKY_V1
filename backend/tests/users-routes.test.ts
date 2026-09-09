import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { OidcClient } from '../src/auth/oidc.js';
import { createSession, SESSION_COOKIE, TTL_CORTO_MS } from '../src/auth/session.js';
import { buildApp } from '../src/app.js';
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

async function sesionDe(role: Role, email = `${role.toLowerCase()}@5848motors.com`) {
  const usuario = await prisma.user.create({
    data: { email, name: role, role, status: 'ACTIVE' },
  });
  const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
  return { usuario, cookie: `${SESSION_COOKIE}=${token}` };
}

describe('rutas de usuarios', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /users lista con las etiquetas que espera el frontend', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');
    await prisma.user.create({
      data: { email: 'edi@5848motors.com', name: 'Edi', role: 'EDITOR', status: 'PENDING' },
    });

    const r = await app.inject({ method: 'GET', url: '/users', headers: { cookie } });
    expect(r.statusCode).toBe(200);

    const usuarios = r.json().users as Array<{ email: string; role: string; status: string }>;
    const edi = usuarios.find((u) => u.email === 'edi@5848motors.com');
    expect(edi?.role).toBe('Editor');
    expect(edi?.status).toBe('pending');
    await app.close();
  });

  it('un EDITOR no puede listar usuarios', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('EDITOR');

    const r = await app.inject({ method: 'GET', url: '/users', headers: { cookie } });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('sin sesión devuelve 401', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const r = await app.inject({ method: 'GET', url: '/users' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /users invita a alguien como PENDING', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { cookie },
      payload: { email: 'Nuevo@5848Motors.com', role: 'editor' },
    });

    expect(r.statusCode).toBe(201);
    expect(r.json().user.role).toBe('Editor');
    expect(r.json().user.status).toBe('pending');

    const creado = await prisma.user.findUnique({ where: { email: 'nuevo@5848motors.com' } });
    expect(creado?.role).toBe('EDITOR');
    await app.close();
  });

  it('POST /users rechaza un email inválido', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { cookie },
      payload: { email: 'no-es-un-email', role: 'editor' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /users con un email repetido devuelve 409', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');

    const payload = { email: 'nuevo@5848motors.com', role: 'editor' };
    await app.inject({ method: 'POST', url: '/users', headers: { cookie }, payload });
    const r = await app.inject({ method: 'POST', url: '/users', headers: { cookie }, payload });

    expect(r.statusCode).toBe(409);
    await app.close();
  });

  it('PATCH /users/:id cambia el rol', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');
    const otro = await prisma.user.create({
      data: { email: 'edi@5848motors.com', name: 'Edi', role: 'EDITOR', status: 'ACTIVE' },
    });

    const r = await app.inject({
      method: 'PATCH',
      url: `/users/${otro.id}`,
      headers: { cookie },
      payload: { role: 'viewer' },
    });

    expect(r.statusCode).toBe(200);
    expect(r.json().user.role).toBe('Solo lectura');
    await app.close();
  });

  it('un ADMIN no puede degradarse a sí mismo', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { usuario, cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'PATCH',
      url: `/users/${usuario.id}`,
      headers: { cookie },
      payload: { role: 'viewer' },
    });

    expect(r.statusCode).toBe(409);
    await app.close();
  });

  it('un ADMIN no puede borrarse a sí mismo', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { usuario, cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'DELETE',
      url: `/users/${usuario.id}`,
      headers: { cookie },
    });
    expect(r.statusCode).toBe(409);
    await app.close();
  });

  it('borrar a alguien invalida su sesión abierta', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');
    const victima = await sesionDe('EDITOR', 'victima@5848motors.com');

    const antes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: victima.cookie },
    });
    expect(antes.statusCode).toBe(200);

    const borrado = await app.inject({
      method: 'DELETE',
      url: `/users/${victima.usuario.id}`,
      headers: { cookie },
    });
    expect(borrado.statusCode).toBe(204);

    const despues = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: victima.cookie },
    });
    expect(despues.statusCode).toBe(401);
    await app.close();
  });

  it('PATCH sobre un id inexistente devuelve 404', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'PATCH',
      url: '/users/no-existe',
      headers: { cookie },
      payload: { role: 'viewer' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });
});
