import { NextResponse } from 'next/server';
import { inviteUser, listUsers } from '@/server/store';
import type { UserRole } from '@/types';

const ROLE_LABELS: Record<string, UserRole> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Solo lectura',
};

export async function GET() {
  return NextResponse.json({ users: listUsers() });
}

/** Invita a un usuario al panel. `role` llega como admin | editor | viewer. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; role?: string } | null;
  const email = body?.email?.trim();
  if (!email) return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 });

  const role = ROLE_LABELS[body?.role ?? 'editor'] ?? 'Editor';
  return NextResponse.json({ user: inviteUser(email, role) }, { status: 201 });
}
