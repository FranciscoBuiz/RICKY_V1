import { describe, expect, it } from 'vitest';
import { seedActionAlerts, seedAppointments, seedLeads } from '@/server/data/crm';
import type { AppointmentStatus, LeadStatus } from '@/types';

const ESTADOS_LEAD: LeadStatus[] = ['new', 'contacted', 'negotiating', 'closed', 'discarded'];
const ESTADOS_TURNO: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

describe('semilla del panel', () => {
  it.each(ESTADOS_LEAD)('tiene al menos una consulta en estado %s', (estado) => {
    expect(seedLeads.some((lead) => lead.status === estado)).toBe(true);
  });

  it.each(ESTADOS_TURNO)('tiene al menos un turno en estado %s', (estado) => {
    expect(seedAppointments.some((turno) => turno.status === estado)).toBe(true);
  });

  it('tiene las tres clases de alerta del dashboard', () => {
    expect(new Set(seedActionAlerts.map((a) => a.type))).toEqual(
      new Set(['urgent', 'important', 'pending']),
    );
  });

  it('pone los turnos terminados y cancelados en el pasado', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    for (const turno of seedAppointments) {
      if (turno.status === 'completed' || turno.status === 'cancelled') {
        expect(turno.date < hoy).toBe(true);
      }
    }
  });

  it('pone los turnos pendientes y confirmados a futuro', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    for (const turno of seedAppointments) {
      if (turno.status === 'pending' || turno.status === 'confirmed') {
        expect(turno.date >= hoy).toBe(true);
      }
    }
  });
});
