import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/env.js';

const env = loadEnv({
  DATABASE_URL: 'postgresql://u:p@localhost:5432/motors',
  APP_ORIGIN: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  SESSION_COOKIE_SECRET: 'x'.repeat(32),
});

describe('GET /health', () => {
  it('responde ok', async () => {
    const app = await buildApp({ env });
    const respuesta = await app.inject({ method: 'GET', url: '/health' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ ok: true });

    await app.close();
  });
});
