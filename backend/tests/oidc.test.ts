import { describe, expect, it } from 'vitest';
import { identityFromClaims } from '../src/auth/oidc.js';

describe('identityFromClaims', () => {
  it('mapea los claims de un ID token de Google', () => {
    const identidad = identityFromClaims({
      sub: '1029384756',
      email: 'Jefe@5848Motors.com',
      email_verified: true,
      name: 'Jefe Motors',
    });

    expect(identidad).toEqual({
      sub: '1029384756',
      email: 'jefe@5848motors.com',
      emailVerified: true,
      name: 'Jefe Motors',
    });
  });

  it('usa la parte local del email si no vino el nombre', () => {
    const identidad = identityFromClaims({
      sub: '1',
      email: 'jefe@5848motors.com',
      email_verified: true,
    });
    expect(identidad.name).toBe('jefe');
  });

  it('marca emailVerified en false si el claim no vino', () => {
    const identidad = identityFromClaims({ sub: '1', email: 'a@b.com' });
    expect(identidad.emailVerified).toBe(false);
  });

  it('falla si no hay sub', () => {
    expect(() => identityFromClaims({ email: 'a@b.com' })).toThrow(/sub/);
  });

  it('falla si no hay email', () => {
    expect(() => identityFromClaims({ sub: '1' })).toThrow(/email/);
  });
});
