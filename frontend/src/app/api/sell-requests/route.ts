import { NextResponse } from 'next/server';
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
    imageCount: body.imageCount ?? 0,
  };

  return NextResponse.json({ request: createSellRequest(payload) }, { status: 201 });
}
