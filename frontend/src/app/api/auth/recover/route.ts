import { NextResponse } from 'next/server';
import { isEmail, passwordIsValid } from '@/lib/validation';

type RecoverStep = 'request' | 'verify' | 'reset';

interface RecoverBody {
  step?: RecoverStep;
  email?: string;
  code?: string;
  password?: string;
  confirm?: string;
}

/**
 * Recuperación de contraseña en tres pasos. Simula el envío del enlace y la
 * verificación del código; el punto de integración real es el proveedor de mail.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RecoverBody | null;

  switch (body?.step) {
    case 'request':
      if (!isEmail(body.email ?? '')) {
        return NextResponse.json({ error: 'Ingresá un email válido.' }, { status: 400 });
      }
      return NextResponse.json({ next: 'verify' });

    case 'verify':
      if (!/^\d{6}$/.test((body.code ?? '').trim())) {
        return NextResponse.json({ error: 'El código tiene 6 dígitos.' }, { status: 400 });
      }
      return NextResponse.json({ next: 'reset' });

    case 'reset':
      if (!passwordIsValid(body.password ?? '')) {
        return NextResponse.json(
          { error: 'La contraseña debe tener 8 caracteres, una mayúscula y un número.' },
          { status: 400 },
        );
      }
      if (body.password !== body.confirm) {
        return NextResponse.json({ error: 'Las contraseñas no coinciden.' }, { status: 400 });
      }
      return NextResponse.json({ next: 'done' });

    default:
      return NextResponse.json({ error: 'Paso inválido' }, { status: 400 });
  }
}
