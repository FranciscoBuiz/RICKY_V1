import { afterEach, describe, expect, it, vi } from 'vitest';

/* Los `page.tsx` del panel no tienen el `Request` en la mano: leen la cookie
   por `next/headers`. Es la misma pregunta al backend que hace `getSession`,
   con otra puerta de entrada, así que se mockea sólo esa puerta. */
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const { cookies } = await import('next/headers');
const { getSessionFromCookies } = await import('@/lib/session');

const USUARIO = {
  id: 'u-1',
  name: 'Fran',
  email: 'fran@example.com',
  role: 'Solo lectura',
  status: 'active',
};

function cookieStore(valor: string) {
  return { toString: () => valor } as unknown as Awaited<ReturnType<typeof cookies>>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(cookies).mockReset();
});

describe('getSessionFromCookies', () => {
  it('devuelve el usuario que valida el backend', async () => {
    vi.mocked(cookies).mockResolvedValue(cookieStore('motors_session=token'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ user: USUARIO }), { status: 200 })),
    );

    expect(await getSessionFromCookies()).toEqual(USUARIO);
  });

  it('reenvía las cookies del store tal cual', async () => {
    vi.mocked(cookies).mockResolvedValue(cookieStore('motors_session=abc123'));
    const espia = vi.fn(async () => new Response(JSON.stringify({ user: USUARIO }), { status: 200 }));
    vi.stubGlobal('fetch', espia);

    await getSessionFromCookies();

    const [, init] = espia.mock.calls[0] as unknown as [URL, RequestInit];
    expect((init.headers as Record<string, string>).cookie).toBe('motors_session=abc123');
  });

  it('no llama al backend cuando no hay ninguna cookie', async () => {
    vi.mocked(cookies).mockResolvedValue(cookieStore(''));
    const espia = vi.fn();
    vi.stubGlobal('fetch', espia);

    expect(await getSessionFromCookies()).toBeNull();
    expect(espia).not.toHaveBeenCalled();
  });

  it('devuelve null si el backend está caído', async () => {
    vi.mocked(cookies).mockResolvedValue(cookieStore('motors_session=token'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    expect(await getSessionFromCookies()).toBeNull();
  });
});
