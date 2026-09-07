import { describe, expect, it } from 'vitest';
import { initSentry, scrubEvent } from '../src/observability/sentry.js';

describe('scrubEvent', () => {
  it('borra el código de OAuth de la URL', () => {
    const evento = scrubEvent({
      request: {
        url: 'http://localhost:4000/auth/google/callback?code=4/0Ax7SECRETO&state=abc123&scope=openid',
      },
    });

    expect(evento.request?.url).not.toContain('4/0Ax7SECRETO');
    expect(evento.request?.url).not.toContain('abc123');
    expect(evento.request?.url).toContain('code=%5Bdepurado%5D');
    expect(evento.request?.url).toContain('scope=openid');
  });

  it('borra cookies y el header Authorization', () => {
    const evento = scrubEvent({
      request: {
        url: 'http://localhost:4000/users',
        cookies: { motors_session: 'token-de-sesion-real' },
        headers: {
          cookie: 'motors_session=token-de-sesion-real',
          authorization: 'Bearer secreto',
          'user-agent': 'Firefox',
        },
      },
    });

    expect(evento.request?.cookies).toBeUndefined();
    expect(evento.request?.headers?.cookie).toBeUndefined();
    expect(evento.request?.headers?.authorization).toBeUndefined();
    expect(evento.request?.headers?.['user-agent']).toBe('Firefox');
  });

  it('borra el cuerpo de los requests a /auth', () => {
    const evento = scrubEvent({
      request: { url: 'http://localhost:4000/auth/logout', data: { algo: 'sensible' } },
    });
    expect(evento.request?.data).toBeUndefined();
  });

  it('conserva el cuerpo de los requests que no son de auth', () => {
    const evento = scrubEvent({
      request: { url: 'http://localhost:4000/users', data: { email: 'a@b.com' } },
    });
    expect(evento.request?.data).toEqual({ email: 'a@b.com' });
  });

  it('del usuario deja solo el id', () => {
    const evento = scrubEvent({
      user: { id: 'user-1', email: 'jefe@5848motors.com', username: 'Jefe' },
    });
    expect(evento.user).toEqual({ id: 'user-1' });
  });

  it('no explota con un evento vacío', () => {
    expect(() => scrubEvent({})).not.toThrow();
  });
});

describe('initSentry', () => {
  const base = {
    NODE_ENV: 'test' as const,
    PORT: 4000,
    DATABASE_URL: 'postgresql://u:p@localhost:5432/motors',
    APP_ORIGIN: 'http://localhost:3000',
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
    SESSION_COOKIE_SECRET: 'x'.repeat(32),
    SENTRY_ENVIRONMENT: 'test',
    SENTRY_TRACES_SAMPLE_RATE: 0.1,
  };

  it('sin DSN no se inicializa', () => {
    expect(initSentry({ ...base, SENTRY_DSN: undefined })).toBe(false);
  });
});
