import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSession } from '@/lib/session';

function pedido(cookie?: string): Request {
  return new Request('http://localhost:3000/api/admin/vehicles', {
    headers: cookie ? { cookie } : {},
  });
}

const USUARIO = {
  id: 'u-1',
  name: 'Fran',
  email: 'fran@example.com',
  role: 'Administrador',
  status: 'active',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getSession', () => {
  it('devuelve el usuario cuando el backend valida la cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ user: USUARIO }), { status: 200 })),
    );

    expect(await getSession(pedido('motors_session=token'))).toEqual(USUARIO);
  });

  it('devuelve null cuando el backend responde 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'Necesitás iniciar sesión.' }), { status: 401 })),
    );

    expect(await getSession(pedido('motors_session=vencido'))).toBeNull();
  });

  it('no llama al backend si no vino ninguna cookie', async () => {
    const espia = vi.fn();
    vi.stubGlobal('fetch', espia);

    expect(await getSession(pedido())).toBeNull();
    expect(espia).not.toHaveBeenCalled();
  });

  it('devuelve null si el backend está caído, en vez de propagar el error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    expect(await getSession(pedido('motors_session=token'))).toBeNull();
  });

  it('reenvía la cookie entrante tal cual', async () => {
    const espia = vi.fn(async () => new Response(JSON.stringify({ user: USUARIO }), { status: 200 }));
    vi.stubGlobal('fetch', espia);

    await getSession(pedido('motors_session=abc123'));

    const [, init] = (espia.mock.calls[0] as unknown) as [URL, RequestInit];
    expect((init.headers as Record<string, string>).cookie).toBe('motors_session=abc123');
  });
});
