import { NextResponse } from 'next/server';
import { extraServiceNames, simpleServiceNames } from '@/server/data/crm';
import { listServices } from '@/server/store';

/**
 * Servicios de detailing. `simple` y `extras` alimentan el modo simplificado
 * del flujo de reserva (equivalente al prop `serviceMode` del prototipo).
 */
export async function GET() {
  return NextResponse.json({
    services: listServices(),
    simple: simpleServiceNames,
    extras: extraServiceNames,
  });
}
