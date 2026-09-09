import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { GoogleIdentity, OidcClient } from '../src/auth/oidc.js';
import { SESSION_COOKIE } from '../src/auth/session.js';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
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

/** Doble del cliente OIDC: los tests nunca hablan con Google. */
function oidcFalso(identidad: GoogleIdentity | Error): OidcClient {
  return {
    buildAuthUrl: ({ state, nonce, codeChallenge }) => {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('state', state);
      url.searchParams.set('nonce', nonce);
      url.searchParams.set('code_challenge', codeChallenge);
      return url;
    },
    exchange: async () => {
      if (identidad instanceof Error) throw identidad;
      return identidad;
    },
  };
}

const IDENTIDAD: GoogleIdentity = {
  sub: 'google-sub-1',
  email: 'jefe@5848motors.com',
  emailVerified: true,
  name: 'Jefe Motors',
};

/** Arranca el flujo y devuelve la cookie de state que hay que devolver al callback. */
async function iniciarFlujo(app: FastifyInstance, url = '/auth/google') {
  const inicio = await app.inject({ method: 'GET', url });
  const cookies = inicio.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const location = new URL(inicio.headers.location as string);
  return { cookies, state: location.searchParams.get('state')! };
}

describe('rutas de auth', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /auth/google redirige a Google y deja la cookie de state', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const r = await app.inject({ method: 'GET', url: '/auth/google' });

    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toContain('accounts.google.com');
    expect(r.cookies.some((c) => c.name === 'motors_oauth')).toBe(true);
    await app.close();
  });

  it('el callback sin cookie de state redirige con error', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const r = await app.inject({ method: 'GET', url: '/auth/google/callback?code=x&state=y' });

    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toBe('http://localhost:3000/login?error=sesion_expirada');
    await app.close();
  });

  it('el callback con un state que no coincide redirige con error', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=x&state=otro-state',
      headers: { cookie: cookies },
    });

    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toBe('http://localhost:3000/login?error=state_invalido');
    await app.close();
  });

  it('rechaza un email no invitado y no crea sesión', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    expect(r.headers.location).toBe('http://localhost:3000/login?error=no_invitado');
    expect(await prisma.session.count()).toBe(0);
    await app.close();
  });

  it('rechaza un email sin verificar', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'PENDING' },
    });
    const app = await buildApp({
      env,
      oidc: oidcFalso({ ...IDENTIDAD, emailVerified: false }),
    });
    const { cookies, state } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    expect(r.headers.location).toBe('http://localhost:3000/login?error=email_sin_verificar');
    expect(await prisma.session.count()).toBe(0);
    await app.close();
  });

  it('activa al usuario PENDING, le fija el googleSub y crea sesión', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'PENDING' },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    expect(r.headers.location).toBe('http://localhost:3000/admin');

    const usuario = await prisma.user.findUnique({ where: { email: IDENTIDAD.email } });
    expect(usuario?.status).toBe('ACTIVE');
    expect(usuario?.googleSub).toBe('google-sub-1');
    expect(usuario?.lastLoginAt).not.toBeNull();

    const sesion = r.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(sesion?.httpOnly).toBe(true);
    expect(sesion?.sameSite?.toLowerCase()).toBe('lax');
    expect(await prisma.session.count()).toBe(1);
    await app.close();
  });

  it('rechaza a alguien que reclama un email con otro googleSub', async () => {
    await prisma.user.create({
      data: {
        email: IDENTIDAD.email,
        name: 'Jefe',
        role: 'ADMIN',
        status: 'ACTIVE',
        googleSub: 'otro-sub',
      },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    expect(r.headers.location).toBe('http://localhost:3000/login?error=cuenta_en_conflicto');
    expect(await prisma.session.count()).toBe(0);
    await app.close();
  });

  it('con remember=1 la sesión dura 30 días', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'ACTIVE' },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app, '/auth/google?remember=1');

    await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    const sesion = await prisma.session.findFirst();
    // La columna es BIGINT porque 30 días en ms no entran en un INTEGER. Prisma
    // la tipa como `bigint`, pero el adapter de `pg` devuelve un number: el
    // `Number()` deja la aserción a salvo de cuál de los dos venga.
    expect(Number(sesion?.ttlMs)).toBe(30 * 24 * 60 * 60 * 1000);
    await app.close();
  });

  it('GET /auth/me devuelve el usuario logueado y 401 sin sesión', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'ACTIVE' },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const login = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });
    const sesion = login.cookies.find((c) => c.name === SESSION_COOKIE)!;

    const conSesion = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: `${SESSION_COOKIE}=${sesion.value}` },
    });
    expect(conSesion.statusCode).toBe(200);
    expect(conSesion.json().user.email).toBe(IDENTIDAD.email);
    expect(conSesion.json().user.role).toBe('Administrador');

    const sinSesion = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(sinSesion.statusCode).toBe(401);
    await app.close();
  });

  it('el logout revoca la sesión de verdad', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'ACTIVE' },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const login = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });
    const cookieSesion = `${SESSION_COOKIE}=${login.cookies.find((c) => c.name === SESSION_COOKIE)!.value}`;

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: cookieSesion },
    });
    expect(logout.statusCode).toBe(204);

    const despues = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookieSesion },
    });
    expect(despues.statusCode).toBe(401);
    await app.close();
  });

  it('el logout sin sesión también responde 204', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const r = await app.inject({ method: 'POST', url: '/auth/logout' });
    expect(r.statusCode).toBe(204);
    await app.close();
  });
});
