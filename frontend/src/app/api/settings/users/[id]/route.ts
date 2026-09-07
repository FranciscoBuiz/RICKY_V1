import { NextResponse } from 'next/server';
import { removeUser } from '@/server/store';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!removeUser(id)) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
