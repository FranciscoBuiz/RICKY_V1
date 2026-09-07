import { NextResponse } from 'next/server';
import { createLead, listLeads, type LeadInput } from '@/server/store';

export async function GET() {
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
