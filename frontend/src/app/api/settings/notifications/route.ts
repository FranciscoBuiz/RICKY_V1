import { NextResponse } from 'next/server';
import { notificationDefs } from '@/server/data/crm';
import { getNotificationPrefs, updateNotificationPrefs } from '@/server/store';
import type { NotificationPrefs } from '@/types';

export async function GET() {
  return NextResponse.json({ prefs: getNotificationPrefs(), defs: notificationDefs });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<NotificationPrefs> | null;
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  return NextResponse.json({ prefs: updateNotificationPrefs(body) });
}
