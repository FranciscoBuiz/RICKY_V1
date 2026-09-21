import { NextResponse } from 'next/server';
import { puede } from '@/lib/roles';
import { getSession, sinPermiso, sinSesion } from '@/lib/session';
import { getSettings, updateSettings } from '@/server/store';
import type { AgencySettings } from '@/types';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// El sitio muestra dirección y horarios de atención: este GET queda público.
export async function GET() {
  return NextResponse.json({ settings: getSettings() });
}

export async function PATCH(request: Request) {
  const sesion = await getSession(request);
  if (!sesion) return sinSesion();
  if (!puede(sesion.role, 'administrar')) return sinPermiso();
  const body = (await request.json().catch(() => null)) as Partial<AgencySettings> | null;
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });

  if (body.detailingDailyCapacity !== undefined) {
    const capacity = Number(body.detailingDailyCapacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      return NextResponse.json(
        { error: 'El cupo diario de turnos va de 1 a 50.' },
        { status: 400 },
      );
    }
    body.detailingDailyCapacity = capacity;
  }

  for (const key of ['detailingDropoff', 'detailingPickup'] as const) {
    const value = body[key];
    if (value !== undefined && !TIME.test(value)) {
      return NextResponse.json({ error: 'Los horarios van en formato HH:MM.' }, { status: 400 });
    }
  }

  return NextResponse.json({ settings: updateSettings(body) });
}
