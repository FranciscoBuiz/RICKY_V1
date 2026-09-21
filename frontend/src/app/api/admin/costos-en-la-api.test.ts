import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PanelUser, UserRole } from '@/types';

vi.mock('@/lib/session', async () => {
  const real = await vi.importActual<typeof import('@/lib/session')>('@/lib/session');
  return { ...real, getSession: vi.fn() };
});

const { getSession } = await import('@/lib/session');
const mockGetSession = vi.mocked(getSession);

function sesionCon(role: UserRole): PanelUser {
  return { id: 'u-1', name: 'Fran', email: 'fran@example.com', role, status: 'active' };
}

beforeEach(() => {
  mockGetSession.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

/* Se mira el texto crudo de la respuesta y no el objeto parseado a propósito:
   lo que importa es que la palabra no viaje, porque cualquiera con el panel
   abierto puede leer el JSON en la pestaña de red. */
describe('GET /api/admin/vehicles', () => {
  it('no manda costos cuando el rol es Solo lectura', async () => {
    mockGetSession.mockResolvedValue(sesionCon('Solo lectura'));
    const { GET } = await import('@/app/api/admin/vehicles/route');

    const cuerpo = await (await GET(new Request('http://localhost:3000/api/admin/vehicles'))).text();

    expect(cuerpo).not.toContain('purchasePrice');
    expect(cuerpo).not.toContain('expenses');
  });

  it('sigue mandando costos a Editor', async () => {
    mockGetSession.mockResolvedValue(sesionCon('Editor'));
    const { GET } = await import('@/app/api/admin/vehicles/route');

    const cuerpo = await (await GET(new Request('http://localhost:3000/api/admin/vehicles'))).text();

    expect(cuerpo).toContain('purchasePrice');
    expect(cuerpo).toContain('expenses');
  });
});

describe('GET /api/admin/vehicles/[id]', () => {
  it('no manda costos cuando el rol es Solo lectura', async () => {
    mockGetSession.mockResolvedValue(sesionCon('Solo lectura'));
    const { GET } = await import('@/app/api/admin/vehicles/[id]/route');

    const respuesta = await GET(new Request('http://localhost:3000/api/admin/vehicles/etios17'), {
      params: Promise.resolve({ id: 'etios17' }),
    });
    const cuerpo = await respuesta.text();

    expect(respuesta.status).toBe(200);
    expect(cuerpo).not.toContain('purchasePrice');
    expect(cuerpo).not.toContain('expenses');
  });

  it('sigue mandando costos a Administrador', async () => {
    mockGetSession.mockResolvedValue(sesionCon('Administrador'));
    const { GET } = await import('@/app/api/admin/vehicles/[id]/route');

    const cuerpo = await (
      await GET(new Request('http://localhost:3000/api/admin/vehicles/etios17'), {
        params: Promise.resolve({ id: 'etios17' }),
      })
    ).text();

    expect(cuerpo).toContain('purchasePrice');
  });
});

/* El bloque "Negocio" del dashboard mezcla dos cosas: métricas que salen de
   precios públicos y métricas que salen de los costos. Sólo las segundas se
   recortan; sacar las cinco dejaría un hueco sin explicación. */
describe('GET /api/admin/dashboard', () => {
  const etiquetas = async (rol: UserRole): Promise<string[]> => {
    mockGetSession.mockResolvedValue(sesionCon(rol));
    const { GET } = await import('@/app/api/admin/dashboard/route');
    const cuerpo = (await (
      await GET(new Request('http://localhost:3000/api/admin/dashboard'))
    ).json()) as { businessMetrics: { label: string }[] };
    return cuerpo.businessMetrics.map((m) => m.label);
  };

  it('le saca a Solo lectura las métricas que salen de los costos', async () => {
    const labels = await etiquetas('Solo lectura');

    expect(labels).not.toContain('Capital invertido');
    expect(labels).not.toContain('Margen potencial');
    expect(labels).not.toContain('Margen realizado');
  });

  it('le deja a Solo lectura las métricas que no son costos', async () => {
    const labels = await etiquetas('Solo lectura');

    expect(labels).toContain('Valor potencial del stock');
    expect(labels).toContain('Ventas del mes');
  });

  it('le deja las cinco a Editor', async () => {
    expect(await etiquetas('Editor')).toHaveLength(5);
  });
});
