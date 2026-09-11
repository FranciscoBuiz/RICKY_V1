import { NextResponse } from 'next/server';
import { getSession, sinSesion } from '@/lib/session';
import {
  TOPE_CONTACTO,
  TOPE_MENSAJE,
  TOPE_NOMBRE,
  campoDemasiadoLargo,
  errorDeCupo,
  errorDeLargo,
  storeLleno,
} from '@/server/limites';
import { createLead, listLeads, type LeadInput } from '@/server/store';

/** Listado del panel: incluye teléfono y email de cada persona que consultó. */
export async function GET(request: Request) {
  if (!(await getSession(request))) return sinSesion();
  return NextResponse.json({ leads: listLeads() });
}

/** Alta de consulta desde la ficha del vehículo o el formulario de contacto. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LeadInput | null;
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }
  if (!body.phone && !body.email) {
    return NextResponse.json({ error: 'Dejanos un teléfono o un email' }, { status: 400 });
  }

  const largo = campoDemasiadoLargo([
    ['nombre', body.name, TOPE_NOMBRE],
    ['teléfono', body.phone, TOPE_CONTACTO],
    ['email', body.email, TOPE_CONTACTO],
    ['vehículo', body.vehicle, TOPE_CONTACTO],
    ['origen', body.origin, TOPE_CONTACTO],
    ['mensaje', body.message, TOPE_MENSAJE],
  ]);
  if (largo) return errorDeLargo(largo);
  if (storeLleno('leads')) return errorDeCupo();

  return NextResponse.json({ lead: createLead(body) }, { status: 201 });
}
