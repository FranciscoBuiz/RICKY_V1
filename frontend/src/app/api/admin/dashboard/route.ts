import { NextResponse } from 'next/server';
import { seedDashboardLeads, seedTodayAppointments } from '@/server/data/crm';
import { getSession, sinSesion } from '@/lib/session';
import { dashboardPayload } from '@/server/store';

/**
 * Todo lo que necesita el dashboard en una sola llamada: alertas, agenda del
 * día, leads y métricas de negocio.
 */
export async function GET(request: Request) {
  if (!(await getSession(request))) return sinSesion();

  return NextResponse.json({
    ...dashboardPayload(),
    todayAppointments: seedTodayAppointments,
    leads: seedDashboardLeads,
  });
}
