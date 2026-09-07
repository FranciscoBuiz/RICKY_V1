import { NextResponse } from 'next/server';
import { getSettings, listAvailability } from '@/server/store';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_DAYS = 14;

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Cupo diario del taller a partir de una fecha. Los turnos de detailing ocupan
 * el día completo, así que la reserva se hace por fecha y no por horario.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get('from') ?? today();
  if (!ISO_DATE.test(from)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }

  const days = Number(params.get('days')) || DEFAULT_DAYS;
  const settings = getSettings();

  return NextResponse.json({
    days: listAvailability(from, days),
    dropoff: settings.detailingDropoff,
    pickup: settings.detailingPickup,
    capacity: settings.detailingDailyCapacity,
  });
}
