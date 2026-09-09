import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Env } from '../env.js';
import { prisma } from '../db/prisma.js';
import { ETIQUETA_POR_ROL } from '../users/roles.js';
import { requireSession } from './guard.js';
import {
  calcularCodeChallenge,
  generarCodeVerifier,
  generarNonce,
  generarState,
  type OidcClient,
} from './oidc.js';
import {
  createSession,
  revokeSession,
  SESSION_COOKIE,
  TTL_CORTO_MS,
  TTL_LARGO_MS,
} from './session.js';

export const OAUTH_COOKIE = 'motors_oauth';

/** Vida de la cookie de state: lo que tarda una persona en loguearse, no más. */
const OAUTH_COOKIE_MAX_AGE_S = 10 * 60;

interface EstadoOauth {
  state: string;
  nonce: string;
  codeVerifier: string;
  remember: boolean;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  deps: { env: Env; oidc: OidcClient },
): void {
  const { env, oidc } = deps;

  const volverA = (destino: string) => new URL(destino, env.APP_ORIGIN).toString();
  const fallar = (reply: FastifyReply, codigo: string) => {
    reply.clearCookie(OAUTH_COOKIE, { path: '/' });
    return reply.redirect(volverA(`/login?error=${codigo}`), 302);
  };

  app.get('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const codeVerifier = generarCodeVerifier();
    const codeChallenge = await calcularCodeChallenge(codeVerifier);

    const estado: EstadoOauth = {
      state: generarState(),
      nonce: generarNonce(),
      codeVerifier,
      remember: (request.query as { remember?: string }).remember === '1',
    };

    // Firmada: el flag `remember` y el `state` no pueden alterarse en el camino.
    reply.setCookie(OAUTH_COOKIE, JSON.stringify(estado), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      signed: true,
      maxAge: OAUTH_COOKIE_MAX_AGE_S,
    });

    const destino = oidc.buildAuthUrl({
      state: estado.state,
      nonce: estado.nonce,
      codeChallenge,
    });

    return reply.redirect(destino.toString(), 302);
  });

  app.get('/auth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const crudo = request.cookies[OAUTH_COOKIE];
    if (!crudo) return fallar(reply, 'sesion_expirada');

    const desfirmada = request.unsignCookie(crudo);
    if (!desfirmada.valid || !desfirmada.value) return fallar(reply, 'state_invalido');

    let estado: EstadoOauth;
    try {
      estado = JSON.parse(desfirmada.value) as EstadoOauth;
    } catch {
      return fallar(reply, 'state_invalido');
    }

    const query = request.query as { state?: string; code?: string; error?: string };
    if (query.error) return fallar(reply, 'google_rechazo');
    if (!query.state || query.state !== estado.state) return fallar(reply, 'state_invalido');

    // openid-client vuelve a leer `code` y `state` de la URL completa del callback.
    const queryString = request.raw.url?.includes('?')
      ? request.raw.url.slice(request.raw.url.indexOf('?'))
      : '';

    let identidad;
    try {
      identidad = await oidc.exchange({
        currentUrl: new URL(env.OAUTH_REDIRECT_URI + queryString),
        codeVerifier: estado.codeVerifier,
        expectedState: estado.state,
        expectedNonce: estado.nonce,
      });
    } catch (error) {
      request.log.warn({ err: error }, 'fallo el intercambio del code con Google');
      return fallar(reply, 'google_fallo');
    }

    // Un email sin verificar no prueba nada: cualquiera pudo declararlo.
    if (!identidad.emailVerified) return fallar(reply, 'email_sin_verificar');

    const usuario = await prisma.user.findUnique({ where: { email: identidad.email } });

    // Solo por invitación: una cuenta de Google cualquiera no entra al panel.
    if (!usuario) return fallar(reply, 'no_invitado');

    // Alguien reclamando un email que ya está atado a otra cuenta de Google.
    if (usuario.googleSub && usuario.googleSub !== identidad.sub) {
      return fallar(reply, 'cuenta_en_conflicto');
    }

    const actualizado = await prisma.user.update({
      where: { id: usuario.id },
      data: {
        status: 'ACTIVE',
        googleSub: identidad.sub,
        lastLoginAt: new Date(),
        name: usuario.status === 'PENDING' ? identidad.name : usuario.name,
      },
    });

    const ttlMs = estado.remember ? TTL_LARGO_MS : TTL_CORTO_MS;
    const token = await createSession({
      userId: actualizado.id,
      ttlMs,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    reply.clearCookie(OAUTH_COOKIE, { path: '/' });
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      // Lax y no Strict: la vuelta desde Google es una navegación cross-site y
      // con Strict el navegador no manda la cookie.
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: Math.floor(ttlMs / 1000),
    });

    return reply.redirect(volverA('/admin'), 302);
  });

  app.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await revokeSession(token);

    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    // Idempotente: no es un canal para averiguar si una sesión existía.
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: requireSession }, async (request: FastifyRequest) => {
    const usuario = request.user!;
    return {
      user: {
        id: usuario.id,
        name: usuario.name,
        email: usuario.email,
        role: ETIQUETA_POR_ROL[usuario.role],
        status: usuario.status === 'ACTIVE' ? 'active' : 'pending',
      },
    };
  });
}
