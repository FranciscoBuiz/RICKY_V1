import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { puede, type Accion } from '@/lib/roles';
import type { PanelUser, UserRole } from '@/types';

/* Mismo recorte que el resto de los tests del borde: `getSession` es la única
   costura mockeada, y la regla de rol se evalúa de verdad. */
vi.mock('@/lib/session', async () => {
  const real = await vi.importActual<typeof import('@/lib/session')>('@/lib/session');
  return { ...real, getSession: vi.fn() };
});

const { getSession } = await import('@/lib/session');
const mockGetSession = vi.mocked(getSession);

const ROLES: UserRole[] = ['Administrador', 'Editor', 'Solo lectura'];

function sesionCon(role: UserRole): PanelUser {
  return { id: 'u-1', name: 'Fran', email: 'fran@example.com', role, status: 'active' };
}

/*
 * Cada fila es la decisión de permiso de un handler. Los cuerpos y los ids son
 * deliberadamente inválidos: al rol autorizado le queremos ver un 400 o un 404,
 * no un 403, y así ninguna corrida del test toca el store.
 */
interface Caso {
  nombre: string;
  modulo: string;
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  accion: Accion;
  segundoArg?: { params: Promise<{ id: string }> };
  cuerpo?: string;
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const CASOS: Caso[] = [
  { nombre: 'GET /api/admin/dashboard', modulo: '@/app/api/admin/dashboard/route', metodo: 'GET', accion: 'leer' },
  { nombre: 'GET /api/admin/vehicles', modulo: '@/app/api/admin/vehicles/route', metodo: 'GET', accion: 'leer' },
  { nombre: 'POST /api/admin/vehicles', modulo: '@/app/api/admin/vehicles/route', metodo: 'POST', accion: 'escribir', cuerpo: '{}' },
  { nombre: 'GET /api/admin/vehicles/[id]', modulo: '@/app/api/admin/vehicles/[id]/route', metodo: 'GET', accion: 'leer', segundoArg: params('no-existe') },
  { nombre: 'PATCH /api/admin/vehicles/[id]', modulo: '@/app/api/admin/vehicles/[id]/route', metodo: 'PATCH', accion: 'escribir', segundoArg: params('no-existe'), cuerpo: '{"brand":"X"}' },
  { nombre: 'DELETE /api/admin/vehicles/[id]', modulo: '@/app/api/admin/vehicles/[id]/route', metodo: 'DELETE', accion: 'escribir', segundoArg: params('no-existe') },
  { nombre: 'GET /api/appointments', modulo: '@/app/api/appointments/route', metodo: 'GET', accion: 'leer' },
  { nombre: 'PATCH /api/appointments/[id]', modulo: '@/app/api/appointments/[id]/route', metodo: 'PATCH', accion: 'escribir', segundoArg: params('no-existe'), cuerpo: '{"status":"confirmed"}' },
  { nombre: 'GET /api/leads', modulo: '@/app/api/leads/route', metodo: 'GET', accion: 'leer' },
  { nombre: 'PATCH /api/leads/[id]', modulo: '@/app/api/leads/[id]/route', metodo: 'PATCH', accion: 'escribir', segundoArg: params('no-existe'), cuerpo: '{"status":"contacted"}' },
  { nombre: 'GET /api/settings/notifications', modulo: '@/app/api/settings/notifications/route', metodo: 'GET', accion: 'leer' },
  { nombre: 'PATCH /api/settings/notifications', modulo: '@/app/api/settings/notifications/route', metodo: 'PATCH', accion: 'administrar' },
  { nombre: 'PATCH /api/settings', modulo: '@/app/api/settings/route', metodo: 'PATCH', accion: 'administrar', cuerpo: '{"detailingDailyCapacity":0}' },
];

async function invocar(caso: Caso): Promise<Response> {
  const modulo = (await import(/* @vite-ignore */ caso.modulo)) as Record<
    string,
    (peticion: Request, segundo?: unknown) => Promise<Response>
  >;
  const handler = modulo[caso.metodo]!;
  const peticion = new Request('http://localhost:3000/api/x', {
    method: caso.metodo,
    ...(caso.cuerpo ? { body: caso.cuerpo } : {}),
  });
  return handler(peticion, caso.segundoArg);
}

beforeEach(() => {
  mockGetSession.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

describe.each(CASOS)('$nombre (exige $accion)', (caso) => {
  for (const rol of ROLES) {
    const permitido = puede(rol, caso.accion);

    it(`${rol}: ${permitido ? 'pasa la guarda' : 'recibe 403'}`, async () => {
      mockGetSession.mockResolvedValue(sesionCon(rol));

      const respuesta = await invocar(caso);

      if (permitido) {
        expect(respuesta.status).not.toBe(403);
      } else {
        expect(respuesta.status).toBe(403);
        expect(await respuesta.json()).toEqual({ error: 'No tenés permisos para hacer esto.' });
      }
    });
  }
});
