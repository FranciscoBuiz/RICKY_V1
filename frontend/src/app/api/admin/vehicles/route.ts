import { NextResponse } from 'next/server';
import { puede } from '@/lib/roles';
import { getSession, sinPermiso, sinSesion } from '@/lib/session';
import {
  createVehicle,
  listVehicles,
  stockSummary,
  toPanelVehicle,
  type VehicleInput,
} from '@/server/store';

/** Stock completo del panel, con precio de compra, gastos y margen. */
export async function GET(request: Request) {
  const sesion = await getSession(request);
  if (!sesion) return sinSesion();

  const params = new URL(request.url).searchParams;
  const vehicles = listVehicles({
    status: params.get('status') ?? undefined,
    search: params.get('search') ?? undefined,
  }).map((vehiculo) => toPanelVehicle(vehiculo, sesion.role));
  return NextResponse.json({ vehicles, total: vehicles.length, stock: stockSummary() });
}

export async function POST(request: Request) {
  const sesion = await getSession(request);
  if (!sesion) return sinSesion();
  if (!puede(sesion.role, 'escribir')) return sinPermiso();

  const body = (await request.json().catch(() => null)) as VehicleInput | null;
  if (!body || !body.brand || !body.model) {
    return NextResponse.json({ error: 'Marca y modelo son obligatorios' }, { status: 400 });
  }
  return NextResponse.json({ vehicle: createVehicle(body) }, { status: 201 });
}
