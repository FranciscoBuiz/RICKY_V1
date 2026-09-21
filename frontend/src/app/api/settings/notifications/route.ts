import { NextResponse } from 'next/server';
import { puede } from '@/lib/roles';
import { getSession, sinPermiso, sinSesion } from '@/lib/session';
import { notificationDefs } from '@/server/data/crm';
import { getNotificationPrefs, updateNotificationPrefs } from '@/server/store';
import type { NotificationPrefs } from '@/types';

// Las preferencias de notificación son del panel entero: los dos métodos exigen sesión.
export async function GET(request: Request) {
  if (!(await getSession(request))) return sinSesion();
  return NextResponse.json({ prefs: getNotificationPrefs(), defs: notificationDefs });
}

export async function PATCH(request: Request) {
  const sesion = await getSession(request);
  if (!sesion) return sinSesion();
  if (!puede(sesion.role, 'administrar')) return sinPermiso();
  const body = (await request.json().catch(() => null)) as Partial<NotificationPrefs> | null;
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  return NextResponse.json({ prefs: updateNotificationPrefs(body) });
}
