import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Cada ruta se importa dentro del test y no arriba: el helper de sesión se
   mockea antes, y un import estático lo evaluaría con el módulo real. */
vi.mock('@/lib/session', async () => {
  const real = await vi.importActual<typeof import('@/lib/session')>('@/lib/session');
  return { ...real, getSession: vi.fn() };
});

const { getSession } = await import('@/lib/session');
const mockGetSession = vi.mocked(getSession);

const USUARIO = {
  id: 'u-1',
  name: 'Fran',
  email: 'fran@example.com',
  role: 'Administrador' as const,
  status: 'active' as const,
};

beforeEach(() => {
  mockGetSession.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

describe('GET /api/admin/vehicles', () => {
  it('responde 401 sin sesión', async () => {
    mockGetSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/vehicles/route');

    const respuesta = await GET(new Request('http://localhost:3000/api/admin/vehicles'));

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual({ error: 'Necesitás iniciar sesión.' });
  });

  it('responde 200 con sesión', async () => {
    mockGetSession.mockResolvedValue(USUARIO);
    const { GET } = await import('@/app/api/admin/vehicles/route');

    const respuesta = await GET(new Request('http://localhost:3000/api/admin/vehicles'));

    expect(respuesta.status).toBe(200);
  });

  it('no filtra purchasePrice ni expenses en la respuesta 401', async () => {
    mockGetSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/vehicles/route');

    const cuerpo = await (await GET(new Request('http://localhost:3000/api/admin/vehicles'))).text();

    expect(cuerpo).not.toContain('purchasePrice');
    expect(cuerpo).not.toContain('expenses');
  });
});

describe('GET /api/admin/dashboard', () => {
  it('responde 401 sin sesión', async () => {
    mockGetSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/dashboard/route');

    expect((await GET(new Request('http://localhost:3000/api/admin/dashboard'))).status).toBe(401);
  });
});

describe('POST /api/admin/vehicles', () => {
  it('responde 401 sin sesión y no crea nada', async () => {
    mockGetSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/admin/vehicles/route');

    const respuesta = await POST(
      new Request('http://localhost:3000/api/admin/vehicles', {
        method: 'POST',
        body: JSON.stringify({ brand: 'Intruso', model: 'X' }),
      }),
    );

    expect(respuesta.status).toBe(401);
  });
});
