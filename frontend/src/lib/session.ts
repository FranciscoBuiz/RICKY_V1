import { cookies } from 'next/headers';
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
  return sesionDesdeCookie(request.headers.get('cookie'));
}

/**
 * La misma pregunta, para los server components del panel, que no tienen el
 * `Request` a mano. Existe para que una página pueda decidir qué controles
 * dibujar según el rol; la autorización de verdad la siguen haciendo las rutas.
 */
export async function getSessionFromCookies(): Promise<PanelUser | null> {
  const store = await cookies();
  return sesionDesdeCookie(store.toString());
}

async function sesionDesdeCookie(cookie: string | null): Promise<PanelUser | null> {
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

/**
 * 403, no 401: la sesión es válida: lo que falta es el permiso. Distinguirlos
 * importa porque el cliente reacciona distinto — un 401 manda a `/login`, y
 * mandar ahí a alguien que ya inició sesión lo deja en un rulo.
 */
export function sinPermiso(): NextResponse {
  return NextResponse.json({ error: 'No tenés permisos para hacer esto.' }, { status: 403 });
}
