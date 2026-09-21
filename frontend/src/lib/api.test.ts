import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiSend } from '@/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

/*
 * `POST /auth/logout` contesta 204 sin cuerpo, que es lo correcto para algo que
 * no tiene nada que devolver. El helper hacia `response.json()` sobre el vacio
 * y tiraba SyntaxError, asi que un logout exitoso se veia como un error. No es
 * un problema del logout: es del helper, y le va a pasar a cualquier endpoint
 * que no devuelva cuerpo.
 */
describe('apiSend', () => {
  it('acepta un 204 sin cuerpo en vez de romperse', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));

    await expect(apiSend('/api/auth/logout', 'POST')).resolves.toBeNull();
  });

  it('sigue devolviendo el JSON cuando la respuesta trae cuerpo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ lead: { id: 'l-1' } }), { status: 200 })),
    );

    await expect(apiSend('/api/leads/l-1', 'PATCH', { status: 'contacted' })).resolves.toEqual({
      lead: { id: 'l-1' },
    });
  });

  it('sigue levantando el mensaje del backend cuando falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'No tenés permisos para hacer esto.' }), {
            status: 403,
          }),
      ),
    );

    await expect(apiSend('/api/settings', 'PATCH', {})).rejects.toThrow(
      'No tenés permisos para hacer esto.',
    );
  });
});
