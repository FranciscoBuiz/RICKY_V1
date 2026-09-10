import { NextResponse } from 'next/server';
import type { PanelUser } from '@/types';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';

/**
 * Traduce la cookie entrante a un usuario preguntándole al backend.
 *
 * No valida el token acá a propósito: el backend es el único que sabe si sigue
 * vivo, si fue revocado y qué rol tiene hoy. Replicar esa lógica en Next daría
 * dos fuentes de verdad que se desincronizan en la primera revocación.
 */
export async function getSession(request: Request): Promise<PanelUser | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;

  try {
    const respuesta = await fetch(new URL('/auth/me', BACKEND), {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!respuesta.ok) return null;

    const cuerpo = (await respuesta.json()) as { user?: PanelUser };
    return cuerpo.user ?? null;
  } catch {
    /* Backend caído o inalcanzable. Sin sesión comprobable no se autoriza:
       fallar abierto acá expondría los costos internos justo cuando el sistema
       está en su peor momento. */
    return null;
  }
}

/** Misma forma `{ error }` que consume `frontend/src/lib/api.ts`. */
export function sinSesion(): NextResponse {
  return NextResponse.json({ error: 'Necesitás iniciar sesión.' }, { status: 401 });
}
