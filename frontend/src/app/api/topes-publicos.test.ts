import { beforeEach, describe, expect, it } from 'vitest';
import { POST as postAppointment } from '@/app/api/appointments/route';
import { POST as postLead } from '@/app/api/leads/route';
import { POST as postSellRequest } from '@/app/api/sell-requests/route';
import { isoDate } from '@/lib/format';
import { TOPE_CONTACTO, TOPE_MENSAJE, TOPE_NOMBRE, TOPE_REGISTROS } from '@/server/limites';
import { createAppointment, createLead, createSellRequest, store } from '@/server/store';

/* Los topes son una regla de seguridad, no una validación de formulario: sin
   ellos un extraño voltea el contenedor `web` a fuerza de cuerpos gigantes y el
   reinicio se lleva puesto el store en memoria. Si un refactor los saca, esto
   tiene que romperse. */

const globalStore = globalThis as unknown as { __m5848Store?: unknown };

/** Una fecha bien a futuro: no la ocupa ningún turno de la semilla. */
function fechaLibre(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 60);
  return isoDate(fecha);
}

function post(handler: (r: Request) => Promise<Response>, body: unknown) {
  return handler(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }));
}

const largo = (n: number) => 'a'.repeat(n);

beforeEach(() => {
  // Store limpio: los tests de cupo llenan colecciones enteras.
  delete globalStore.__m5848Store;
});

describe('topes de largo en los POST públicos', () => {
  it('acepta una consulta dentro de los topes', async () => {
    const res = await post(postLead, {
      name: largo(TOPE_NOMBRE),
      phone: largo(TOPE_CONTACTO),
      message: largo(TOPE_MENSAJE),
    });
    expect(res.status).toBe(201);
  });

  it.each([
    ['nombre', { name: largo(TOPE_NOMBRE + 1), phone: '223' }],
    ['teléfono', { name: 'Ana', phone: largo(TOPE_CONTACTO + 1) }],
    ['email', { name: 'Ana', email: largo(TOPE_CONTACTO + 1) }],
    ['mensaje', { name: 'Ana', phone: '223', message: largo(TOPE_MENSAJE + 1) }],
  ])('rechaza la consulta con %s pasado de largo', async (campo, body) => {
    const res = await post(postLead, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: `El campo ${campo} es demasiado largo` });
  });

  it('rechaza el turno con el nombre pasado de largo', async () => {
    const res = await post(postAppointment, {
      client: largo(TOPE_NOMBRE + 1),
      service: 'Detailing',
      date: fechaLibre(),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'El campo nombre es demasiado largo' });
  });

  it('rechaza la solicitud de venta con los comentarios pasados de largo', async () => {
    const res = await post(postSellRequest, {
      name: 'Ana',
      phone: '223',
      notes: largo(TOPE_MENSAJE + 1),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'El campo comentarios es demasiado largo' });
  });

  it('acepta un turno dentro de los topes', async () => {
    const res = await post(postAppointment, {
      client: 'Ana',
      service: largo(TOPE_CONTACTO),
      date: fechaLibre(),
    });
    expect(res.status).toBe(201);
  });
});

describe('tope de registros del store', () => {
  it('deja de aceptar consultas al llegar al tope', async () => {
    while (store().leads.length < TOPE_REGISTROS) {
      createLead({ name: 'Relleno', phone: '223' });
    }
    expect(store().leads.length).toBe(TOPE_REGISTROS);

    const res = await post(postLead, { name: 'Ana', phone: '223' });
    expect(res.status).toBe(429);
    expect(store().leads.length).toBe(TOPE_REGISTROS);
  });

  it('deja de aceptar turnos al llegar al tope', async () => {
    const fecha = fechaLibre();
    while (store().appointments.length < TOPE_REGISTROS) {
      createAppointment({ client: 'Relleno', service: 'Detailing', date: '2000-01-01' });
    }
    expect(store().appointments.length).toBe(TOPE_REGISTROS);

    const res = await post(postAppointment, { client: 'Ana', service: 'Detailing', date: fecha });
    expect(res.status).toBe(429);
  });

  it('deja de aceptar solicitudes de venta al llegar al tope', async () => {
    while (store().sellRequests.length < TOPE_REGISTROS) {
      createSellRequest({
        name: 'Relleno',
        phone: '223',
        email: '',
        brand: '',
        model: '',
        version: '',
        year: '',
        mileage: '',
        plate: '',
        color: '',
        condition: '',
        service: '',
        accidents: '',
        notes: '',
        imageCount: 0,
      });
    }

    const res = await post(postSellRequest, { name: 'Ana', phone: '223' });
    expect(res.status).toBe(429);
    expect(store().sellRequests.length).toBe(TOPE_REGISTROS);
  });
});
