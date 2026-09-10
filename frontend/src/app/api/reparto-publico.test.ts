import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', async () => {
  const real = await vi.importActual<typeof import('@/lib/session')>('@/lib/session');
  return { ...real, getSession: vi.fn() };
});

const { getSession } = await import('@/lib/session');
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(null);
});

/* Cada fila es una decisión del spec, no un detalle de implementación: si
   alguien abre un GET privado o cierra un POST público, este test lo dice.
   El segundo argumento es opcional porque las rutas [id] lo necesitan
   (los params vienen como promesa) y el resto no. */
const PRIVADOS: {
  nombre: string;
  modulo: string;
  metodo: 'GET' | 'PATCH';
  segundoArg?: { params: Promise<{ id: string }> };
}[] = [
  { nombre: 'GET /api/leads', modulo: '@/app/api/leads/route', metodo: 'GET' },
  {
    nombre: 'PATCH /api/leads/[id]',
    modulo: '@/app/api/leads/[id]/route',
    metodo: 'PATCH',
    segundoArg: { params: Promise.resolve({ id: 'no-existe' }) },
  },
  { nombre: 'GET /api/appointments', modulo: '@/app/api/appointments/route', metodo: 'GET' },
  {
    nombre: 'PATCH /api/appointments/[id]',
    modulo: '@/app/api/appointments/[id]/route',
    metodo: 'PATCH',
    segundoArg: { params: Promise.resolve({ id: 'no-existe' }) },
  },
  { nombre: 'PATCH /api/settings', modulo: '@/app/api/settings/route', metodo: 'PATCH' },
  {
    nombre: 'GET /api/settings/notifications',
    modulo: '@/app/api/settings/notifications/route',
    metodo: 'GET',
  },
  {
    nombre: 'PATCH /api/settings/notifications',
    modulo: '@/app/api/settings/notifications/route',
    metodo: 'PATCH',
  },
];

const PUBLICOS: { nombre: string; modulo: string; metodo: 'GET' }[] = [
  { nombre: 'GET /api/vehicles', modulo: '@/app/api/vehicles/route', metodo: 'GET' },
  { nombre: 'GET /api/services', modulo: '@/app/api/services/route', metodo: 'GET' },
  { nombre: 'GET /api/settings', modulo: '@/app/api/settings/route', metodo: 'GET' },
  {
    nombre: 'GET /api/appointments/availability',
    modulo: '@/app/api/appointments/availability/route',
    metodo: 'GET',
  },
];

describe('rutas que exigen sesión', () => {
  it.each(PRIVADOS)('$nombre responde 401 sin sesión', async ({ modulo, metodo, segundoArg }) => {
    const rutas = (await import(modulo)) as Record<string, (r: Request, s?: unknown) => Promise<Response>>;
    const pedido = new Request('http://localhost:3000/api/x', {
      method: metodo,
      body: metodo === 'PATCH' ? JSON.stringify({}) : undefined,
    });

    expect((await rutas[metodo](pedido, segundoArg)).status).toBe(401);
  });
});

describe('rutas que siguen públicas', () => {
  it.each(PUBLICOS)('$nombre no responde 401 sin sesión', async ({ modulo, metodo }) => {
    const rutas = (await import(modulo)) as Record<string, (r: Request) => Promise<Response>>;
    const pedido = new Request('http://localhost:3000/api/x');

    expect((await rutas[metodo](pedido)).status).not.toBe(401);
  });

  it('POST /api/leads sigue aceptando una consulta anónima', async () => {
    const { POST } = await import('@/app/api/leads/route');

    const respuesta = await POST(
      new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify({ name: 'Visitante', phone: '2235550000' }),
      }),
    );

    expect(respuesta.status).toBe(201);
  });

  it('POST /api/appointments sigue aceptando una reserva anónima', async () => {
    const { POST } = await import('@/app/api/appointments/route');

    const respuesta = await POST(
      new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          client: 'Visitante',
          service: 'Lavado premium',
          date: '2027-01-15',
        }),
      }),
    );

    expect([200, 201, 409]).toContain(respuesta.status);
  });
});
