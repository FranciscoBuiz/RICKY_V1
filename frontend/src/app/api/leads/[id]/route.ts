import { NextResponse } from 'next/server';
import { puede } from '@/lib/roles';
import { getSession, sinPermiso, sinSesion } from '@/lib/session';
import { updateLead } from '@/server/store';
import type { Lead } from '@/types';

type LeadPatch = Partial<Pick<Lead, 'status' | 'reply'>>;

/** Cambia el estado del lead y/o registra la respuesta enviada desde el panel. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await getSession(request);
  if (!sesion) return sinSesion();
  if (!puede(sesion.role, 'escribir')) return sinPermiso();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as LeadPatch | null;
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });

  // Responder implica que el lead pasó a "contactado".
  const patch: LeadPatch = body.reply ? { status: 'contacted', ...body } : body;

  const lead = updateLead(id, patch);
  if (!lead) return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
  return NextResponse.json({ lead });
}
