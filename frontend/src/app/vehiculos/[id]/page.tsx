import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVehicle, listVehicles, toPublicVehicle } from '@/server/store';
import { VehiculoDetalleView } from './VehiculoDetalleView';

export function generateStaticParams() {
  return listVehicles().map((vehicle) => ({ id: vehicle.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vehicle = getVehicle(id);
  if (!vehicle) return { title: 'Vehículo no encontrado' };

  const title = `${vehicle.brand} ${vehicle.model} ${vehicle.version}`;
  return {
    title,
    description: `${title} ${vehicle.year} — 5848 Motors, Mar del Plata.`,
  };
}

export default async function VehiculoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = getVehicle(id);
  if (!vehicle) notFound();

  return <VehiculoDetalleView vehicle={toPublicVehicle(vehicle)} />;
}
