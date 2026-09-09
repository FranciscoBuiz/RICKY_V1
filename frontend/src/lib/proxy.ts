import type { NextRequest } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';

/**
 * Reenvía un request al backend conservando cookies en ambos sentidos.
 *
 * `redirect: 'manual'` no es opcional: con el `follow` por defecto, este fetch
 * seguiría el 302 hacia Google desde el servidor y el navegador nunca recibiría
 * el redirect, así que el login jamás arrancaría.
 */
export async function proxyToBackend(request: NextRequest, backendPath: string): Promise<Response> {
  const url = new URL(backendPath, BACKEND);
  url.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('accept-encoding');

  const tieneCuerpo = request.method !== 'GET' && request.method !== 'HEAD';

  const respuesta = await fetch(url, {
    method: request.method,
    headers,
    body: tieneCuerpo ? await request.text() : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  // Set-Cookie puede venir repetido y `new Headers(...)` lo colapsaría en uno solo.
  const salida = new Headers();
  respuesta.headers.forEach((valor, clave) => {
    if (clave.toLowerCase() === 'set-cookie') return;
    if (['content-encoding', 'content-length', 'transfer-encoding'].includes(clave.toLowerCase()))
      return;
    salida.set(clave, valor);
  });
  for (const cookie of respuesta.headers.getSetCookie()) {
    salida.append('set-cookie', cookie);
  }

  return new Response(respuesta.body, { status: respuesta.status, headers: salida });
}
