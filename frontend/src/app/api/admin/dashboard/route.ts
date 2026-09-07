import { NextResponse } from 'next/server';
import { seedDashboardLeads, seedTodayAppointments } from '@/server/data/crm';
import { dashboardPayload } from '@/server/store';

/**
 * Todo lo que necesita el dashboard en una sola llamada: alertas, agenda del
 * día, leads y métricas de negocio.
 */
export async function GET() {
  return NextResponse.json({
    ...dashboardPayload(),
    todayAppointments: seedTodayAppointments,
    leads: seedDashboardLeads,
  });
}
