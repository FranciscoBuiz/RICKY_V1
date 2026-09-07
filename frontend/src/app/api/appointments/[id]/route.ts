import { NextResponse } from 'next/server';
import { updateAppointment } from '@/server/store';
import type { Appointment } from '@/types';

type AppointmentPatch = Partial<Pick<Appointment, 'status' | 'date' | 'time'>>;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as AppointmentPatch | null;
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });

  const appointment = updateAppointment(id, body);
  if (!appointment) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  return NextResponse.json({ appointment });
}
