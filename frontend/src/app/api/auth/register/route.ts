import { NextResponse } from 'next/server';
import { passwordIsValid } from '@/lib/validation';

interface RegisterBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirm?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  const password = body?.password ?? '';

  if (!body?.email?.includes('@')) {
    return NextResponse.json({ error: 'Ingresá un email válido.' }, { status: 400 });
  }
  if (!passwordIsValid(password)) {
    return NextResponse.json({ error: 'La contraseña no cumple los requisitos.' }, { status: 400 });
  }
  if (password !== body.confirm) {
    return NextResponse.json({ error: 'Las contraseñas no coinciden.' }, { status: 400 });
  }

  return NextResponse.json(
    { user: { email: body.email, name: `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim() } },
    { status: 201 },
  );
}
