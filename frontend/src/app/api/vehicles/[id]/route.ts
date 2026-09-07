import { NextResponse } from 'next/server';
import { getVehicle, toPublicVehicle } from '@/server/store';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = getVehicle(id);
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ vehicle: toPublicVehicle(vehicle) });
}
