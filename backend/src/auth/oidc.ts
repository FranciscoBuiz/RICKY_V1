import * as client from 'openid-client';
import type { Env } from '../env.js';

export const GOOGLE_ISSUER = 'https://accounts.google.com';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export interface OidcClient {
  buildAuthUrl(input: { state: string; nonce: string; codeChallenge: string }): URL;
  exchange(input: {
    currentUrl: URL;
    codeVerifier: string;
    expectedState: string;
    expectedNonce: string;
  }): Promise<GoogleIdentity>;
}

/**
 * Separado del cliente real para poder testear el mapeo sin salir a la red.
 * openid-client ya validó firma, `iss`, `aud`, `exp` y `nonce` antes de esto.
 */
export function identityFromClaims(claims: unknown): GoogleIdentity {
  const c = claims as Record<string, unknown> | null | undefined;

  const sub = typeof c?.sub === 'string' ? c.sub : '';
  if (!sub) throw new Error('El ID token no trae sub');

  const email = typeof c?.email === 'string' ? c.email.trim().toLowerCase() : '';
  if (!email) throw new Error('El ID token no trae email');

  const nombre = typeof c?.name === 'string' && c.name.trim() ? c.name.trim() : email.split('@')[0]!;

  return { sub, email, emailVerified: c?.email_verified === true, name: nombre };
}

/**
 * Descubre la configuración de Google una sola vez, al arrancar. openid-client
 * está certificado como Relying Party: valida firma contra las JWKS, `iss`,
 * `aud`, `exp` y `nonce`. Escribir eso a mano es donde aparecen los agujeros.
 */
export async function createGoogleOidcClient(env: Env): Promise<OidcClient> {
  const config = await client.discovery(
    new URL(GOOGLE_ISSUER),
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  );

  return {
    buildAuthUrl({ state, nonce, codeChallenge }) {
      return client.buildAuthorizationUrl(config, {
        redirect_uri: env.OAUTH_REDIRECT_URI,
        // Solo identidad: no pedimos permisos sobre datos de Google.
        scope: 'openid email profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
      });
    },

    async exchange({ currentUrl, codeVerifier, expectedState, expectedNonce }) {
      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: codeVerifier,
        expectedState,
        expectedNonce,
      });

      // Los tokens de Google se descartan acá: identificado el usuario, la sesión es nuestra.
      return identityFromClaims(tokens.claims());
    },
  };
}

export const generarState = client.randomState;
export const generarNonce = client.randomNonce;
export const generarCodeVerifier = client.randomPKCECodeVerifier;
export const calcularCodeChallenge = client.calculatePKCECodeChallenge;
