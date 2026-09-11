import { NextResponse } from 'next/server';
import {
  TOPE_CONTACTO,
  TOPE_MENSAJE,
  TOPE_NOMBRE,
  campoDemasiadoLargo,
  errorDeCupo,
  errorDeLargo,
  storeLleno,
} from '@/server/limites';
import { createSellRequest, listSellRequests } from '@/server/store';
import type { SellRequest } from '@/types';

type SellRequestInput = Omit<SellRequest, 'id' | 'createdAt'>;

export async function GET() {
  return NextResponse.json({ requests: listSellRequests() });
}

/** "Vendé tu auto": crea la solicitud y su lead asociado. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<SellRequestInput> | null;
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }
  if (!body.phone && !body.email) {
    return NextResponse.json({ error: 'Dejanos un teléfono o un email' }, { status: 400 });
  }

  const largo = campoDemasiadoLargo([
    ['nombre', body.name, TOPE_NOMBRE],
    ['teléfono', body.phone, TOPE_CONTACTO],
    ['email', body.email, TOPE_CONTACTO],
    ['marca', body.brand, TOPE_CONTACTO],
    ['modelo', body.model, TOPE_CONTACTO],
    ['versión', body.version, TOPE_CONTACTO],
    ['año', body.year, TOPE_CONTACTO],
    ['kilometraje', body.mileage, TOPE_CONTACTO],
    ['patente', body.plate, TOPE_CONTACTO],
    ['color', body.color, TOPE_CONTACTO],
    ['estado', body.condition, TOPE_CONTACTO],
    ['service', body.service, TOPE_CONTACTO],
    ['siniestros', body.accidents, TOPE_CONTACTO],
    ['comentarios', body.notes, TOPE_MENSAJE],
  ]);
  if (largo) return errorDeLargo(largo);
  // Cada solicitud crea además su lead, así que el tope de las dos colecciones cuenta.
  if (storeLleno('sellRequests', 'leads')) return errorDeCupo();

  const payload: SellRequestInput = {
    name: body.name,
    phone: body.phone ?? '',
    email: body.email ?? '',
    brand: body.brand ?? '',
    model: body.model ?? '',
    version: body.version ?? '',
    year: body.year ?? '',
    mileage: body.mileage ?? '',
    plate: body.plate ?? '',
    color: body.color ?? '',
    condition: body.condition ?? '',
    service: body.service ?? '',
    accidents: body.accidents ?? '',
    notes: body.notes ?? '',
    // El body es JSON sin validar: `Number` lo deja en un número o en 0, para
    // que acá no entre una cadena arbitraria disfrazada de contador.
    imageCount: Number(body.imageCount) || 0,
  };

  return NextResponse.json({ request: createSellRequest(payload) }, { status: 201 });
}
