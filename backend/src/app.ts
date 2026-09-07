import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Env } from './env.js';

export interface AppDeps {
  env: Env;
}

/**
 * Arma la app sin escuchar ningún puerto: así los tests la ejercitan con
 * `app.inject()` sin abrir sockets ni pelear por puertos ocupados.
 */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: deps.env.NODE_ENV !== 'test',
    trustProxy: true,
  });

  await app.register(cookie, { secret: deps.env.SESSION_COOKIE_SECRET });

  app.get('/health', async () => ({ ok: true }));

  return app;
}
