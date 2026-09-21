import { NextResponse } from 'next/server';
import { seedDashboardLeads, seedTodayAppointments } from '@/server/data/crm';
import { puede } from '@/lib/roles';
import { getSession, sinSesion } from '@/lib/session';
import { dashboardPayload } from '@/server/store';

/**
 * Todo lo que necesita el dashboard en una sola llamada: alertas, agenda del
 * día, leads y métricas de negocio.
 */
export async function GET(request: Request) {
  const sesion = await getSession(request);
  if (!sesion) return sinSesion();

  const { businessMetrics, ...resto } = dashboardPayload();

  return NextResponse.json({
    ...resto,
    businessMetrics: puede(sesion.role, 'escribir')
      ? businessMetrics
      : businessMetrics.filter((metrica) => !metrica.interno),
    todayAppointments: seedTodayAppointments,
    leads: seedDashboardLeads,
  });
}
