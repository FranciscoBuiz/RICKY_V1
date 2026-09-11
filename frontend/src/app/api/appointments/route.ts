import { NextResponse } from 'next/server';
import { getSession, sinSesion } from '@/lib/session';
import {
  TOPE_CONTACTO,
  TOPE_NOMBRE,
  campoDemasiadoLargo,
  errorDeCupo,
  errorDeLargo,
  storeLleno,
} from '@/server/limites';
import { createAppointment, dayAvailability, listAppointments, type AppointmentInput } from '@/server/store';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  if (!(await getSession(request))) return sinSesion();
  return NextResponse.json({ appointments: listAppointments() });
}

/** Reserva de turno de detailing desde el sitio público. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AppointmentInput | null;
  if (!body?.client?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }
  if (!body.service?.trim() || !body.date) {
    return NextResponse.json({ error: 'Elegí al menos un servicio y una fecha' }, { status: 400 });
  }
  if (!ISO_DATE.test(body.date)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  const largo = campoDemasiadoLargo([
    ['nombre', body.client, TOPE_NOMBRE],
    ['teléfono', body.phone, TOPE_CONTACTO],
    ['email', body.email, TOPE_CONTACTO],
    ['servicio', body.service, TOPE_CONTACTO],
    ['vehículo', body.vehicle, TOPE_CONTACTO],
    ['patente', body.plate, TOPE_CONTACTO],
    ['horario', body.time, TOPE_CONTACTO],
  ]);
  if (largo) return errorDeLargo(largo);
  if (storeLleno('appointments')) return errorDeCupo();

  // El cupo se revalida acá: entre que el visitante eligió la fecha y confirmó,
  // otro pudo haber tomado el último lugar del día.
  const availability = dayAvailability(body.date);
  if (!availability.available) {
    return NextResponse.json(
      { error: 'Ese día ya no tiene cupo. Elegí otra fecha.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ appointment: createAppointment(body) }, { status: 201 });
}
