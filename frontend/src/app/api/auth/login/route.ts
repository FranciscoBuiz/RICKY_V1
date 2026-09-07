import { NextResponse } from 'next/server';

/**
 * Autenticación simulada: valida el formato de las credenciales y responde
 * como lo haría un backend real. No emite sesión — eso queda para cuando se
 * conecte el proveedor de auth definitivo.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; remember?: boolean }
    | null;

  const email = body?.email?.trim() ?? '';
  const password = body?.password ?? '';

  if (!email.includes('@')) {
    return NextResponse.json({ error: 'Revisá tu email e intentá de nuevo.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  return NextResponse.json({ user: { email, name: email.split('@')[0] }, remember: !!body?.remember });
}
