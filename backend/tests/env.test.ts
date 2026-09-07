import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.js';

const completo = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/motors',
  APP_ORIGIN: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  SESSION_COOKIE_SECRET: 'x'.repeat(32),
};

describe('loadEnv', () => {
  it('acepta una configuración completa y aplica los valores por defecto', () => {
    const env = loadEnv(completo);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.SENTRY_TRACES_SAMPLE_RATE).toBe(0.1);
  });

  it('falla nombrando la variable que falta', () => {
    const { GOOGLE_CLIENT_SECRET, ...incompleto } = completo;
    expect(() => loadEnv(incompleto)).toThrow(/GOOGLE_CLIENT_SECRET/);
  });

  it('rechaza un SESSION_COOKIE_SECRET corto', () => {
    expect(() => loadEnv({ ...completo, SESSION_COOKIE_SECRET: 'corto' })).toThrow(
      /SESSION_COOKIE_SECRET/,
    );
  });

  it('rechaza un APP_ORIGIN que no es una URL', () => {
    expect(() => loadEnv({ ...completo, APP_ORIGIN: 'no-es-una-url' })).toThrow(/APP_ORIGIN/);
  });

  it('convierte PORT a número', () => {
    expect(loadEnv({ ...completo, PORT: '4100' }).PORT).toBe(4100);
  });
});
