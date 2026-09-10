import { NextResponse } from 'next/server';
import { getSession, sinSesion } from '@/lib/session';
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
  return NextResponse.json({ lead: createLead(body) }, { status: 201 });
}
