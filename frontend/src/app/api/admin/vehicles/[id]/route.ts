import { NextResponse } from 'next/server';
import { deleteVehicle, getVehicle, updateVehicle, type VehicleInput } from '@/server/store';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = getVehicle(id);
  if (!vehicle) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  return NextResponse.json({ vehicle });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as VehicleInput | null;
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });

  const vehicle = updateVehicle(id, body);
  if (!vehicle) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  return NextResponse.json({ vehicle });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!deleteVehicle(id)) {
    return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
