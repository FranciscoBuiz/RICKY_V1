'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiSend, useResource } from '@/lib/api';
import { FIELD, HAS_WHATSAPP, appointmentStatusMeta, pillStyle, whatsappHref } from '@/lib/design';
import { longDate, weekdays } from '@/lib/format';
import { useIsNarrow } from '@/lib/hooks';
import { puede } from '@/lib/roles';
import { useTheme } from '@/lib/theme';
import type { Appointment, AppointmentStatus, UserRole } from '@/types';

interface AppointmentsResponse {
  appointments: Appointment[];
}

const TABLE_GRID = '160px 180px 200px 90px 90px 130px 150px 210px';

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const ACTION_BUTTON: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'none',
  color: 'var(--ink)',
  padding: '5px 9px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const DETAIL_LABEL: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 4,
};

/** "2026-09-04" → "04/09" */
function shortLabel(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/** Etiqueta de columna del calendario: "Vie 04". */
function calendarLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}`;
}

export function AdminDetailingView({ rol }: { rol: UserRole }) {
  const escribe = puede(rol, 'escribir');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { dark } = useTheme();
  const toast = useToast();
  const isMobile = useIsNarrow(900);
  const { data, status, error, reload } = useResource<AppointmentsResponse>('/api/appointments');

  const appointments = useMemo(() => data?.appointments ?? [], [data]);

  /**
   * Un único buscador cubre cliente, vehículo, servicio, patente y horario; el
   * estado y la fecha van aparte porque se combinan con la búsqueda.
   */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return appointments.filter((appointment) => {
      if (statusFilter !== 'all' && appointment.status !== statusFilter) return false;
      if (dateFilter && appointment.date !== dateFilter) return false;
      if (!term) return true;
      const haystack = [
        appointment.client,
        appointment.vehicle,
        appointment.service,
        appointment.plate,
        appointment.time,
        shortLabel(appointment.date),
        appointment.date,
        appointment.phone,
        appointmentStatusMeta[appointment.status].label,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [appointments, search, statusFilter, dateFilter]);

  const calendarDays = useMemo(() => {
    const byDate = new Map<string, Appointment[]>();
    filtered.forEach((appointment) => {
      const list = byDate.get(appointment.date) ?? [];
      list.push(appointment);
      byDate.set(appointment.date, list);
    });
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const selected = filtered.find((appointment) => appointment.id === selectedId) ?? null;
  const filtersActive = Boolean(search.trim()) || statusFilter !== 'all' || Boolean(dateFilter);

  async function setStatus(id: string, next: AppointmentStatus) {
    try {
      await apiSend(`/api/appointments/${id}`, 'PATCH', { status: next });
      toast.success('Turno actualizado', appointmentStatusMeta[next].label);
      reload();
    } catch (err) {
      toast.error(
        'No pudimos actualizar el turno',
        err instanceof Error ? err.message : 'Intentá de nuevo.',
      );
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('');
  }

  const viewButton = (active: boolean): CSSProperties => ({
    border: '1px solid var(--border)',
    background: active ? 'var(--invert-bg)' : 'var(--card)',
    color: active ? 'var(--invert-ink)' : 'var(--ink)',
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <AdminShell
      active="Detailing"
      title={<div style={{ fontSize: 14, fontWeight: 600 }}>Detailing — Turnos</div>}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => setView('list')} style={viewButton(view === 'list')}>
            Lista
          </button>
          <button type="button" onClick={() => setView('calendar')} style={viewButton(view === 'calendar')}>
            Calendario
          </button>
        </div>
      }
    >
      <div style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 3vw, 24px) 64px' }}>
        {/* FILTROS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cliente, servicio, patente…"
            aria-label="Buscar turnos"
            style={{ ...FIELD, minWidth: 200, flex: 1, maxWidth: 340 }}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | AppointmentStatus)}
            style={{ ...FIELD, width: 'auto' }}
            aria-label="Estado del turno"
          >
            <option value="all">Estado — Todos</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="Filtrar por fecha"
            style={{ ...FIELD, width: 'auto' }}
          />
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Limpiar
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {status === 'loading' ? 'Cargando…' : `${filtered.length} turnos`}
          </div>
        </div>

        {status === 'loading' && <SkeletonTable rows={5} />}

        {status === 'error' && (
          <ErrorState title="No pudimos cargar los turnos." detail={error} onRetry={reload} />
        )}

        {status === 'ready' && filtered.length === 0 && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sin turnos</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {filtersActive ? 'Ningún turno coincide con los filtros.' : 'Todavía no hay turnos cargados.'}
            </div>
          </div>
        )}

        {status === 'ready' && filtered.length > 0 && view === 'list' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', overflowX: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: TABLE_GRID,
                gap: 12,
                minWidth: 1120,
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                fontSize: 11,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <div>Cliente</div>
              <div>Vehículo</div>
              <div>Servicios</div>
              <div>Fecha</div>
              <div>Entrega</div>
              <div>Teléfono</div>
              <div>Estado</div>
              <div>Acciones</div>
            </div>

            {filtered.map((appointment) => {
              const meta = appointmentStatusMeta[appointment.status];
              return (
                <div
                  key={appointment.id}
                  className="ui-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(appointment.id)}
                  onKeyDown={(event) => event.key === 'Enter' && setSelectedId(appointment.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: TABLE_GRID,
                    gap: 12,
                    minWidth: 1120,
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border2)',
                    alignItems: 'center',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: selectedId === appointment.id ? 'var(--bg)' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{appointment.client}</div>
                  <div style={{ color: 'var(--muted)' }}>{appointment.vehicle || '—'}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{appointment.service}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {shortLabel(appointment.date)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{appointment.time}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{appointment.phone}</div>
                  <div>
                    <span style={pillStyle(meta, dark)}>{meta.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }} onClick={(event) => event.stopPropagation()}>
                    {escribe && (
                      <>
                        <button
                          type="button"
                          onClick={() => setStatus(appointment.id, 'confirmed')}
                          style={ACTION_BUTTON}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(appointment.id, 'completed')}
                          style={ACTION_BUTTON}
                        >
                          Completar
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(appointment.id, 'cancelled')}
                          style={{ ...ACTION_BUTTON, color: 'var(--danger)' }}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {status === 'ready' && filtered.length > 0 && view === 'calendar' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 'clamp(12px, 2vw, 20px)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 1,
                background: 'var(--border)',
                border: '1px solid var(--border)',
              }}
            >
              {calendarDays.map(([date, items]) => (
                <div key={date} style={{ background: 'var(--card)', padding: 12, minHeight: 130 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--muted)',
                      marginBottom: 10,
                    }}
                  >
                    {calendarLabel(date)}
                  </div>
                  {items.map((item) => {
                    const meta = appointmentStatusMeta[item.status];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        aria-pressed={selectedId === item.id}
                        title={`${item.client} — ${item.service}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          fontSize: 11,
                          background: selectedId === item.id ? 'var(--accent-soft)' : 'var(--bg)',
                          color: 'var(--ink)',
                          border: `1px solid ${selectedId === item.id ? 'var(--accent)' : 'var(--border)'}`,
                          padding: '5px 7px',
                          marginBottom: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {/* En la celda no entra una píldora: el estado va como punto. */}
                          <span
                            aria-hidden
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: meta.color,
                              flexShrink: 0,
                            }}
                          />
                          {item.client}
                        </div>
                        <div style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.service}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '14px 0 0' }}>
              Hacé clic en un turno para ver todos sus datos.
            </p>
          </div>
        )}
      </div>

      {/* DETALLE DEL TURNO */}
      {selected && (
        <>
          <div
            role="presentation"
            onClick={() => setSelectedId(null)}
            className="fadein"
            style={{ position: 'fixed', inset: 0, background: 'rgba(16,15,13,0.4)', zIndex: 90 }}
          />
          <div
            role="dialog"
            aria-label={`Turno de ${selected.client}`}
            className="slide-in-right"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: isMobile ? '100vw' : 'min(420px, 100vw)',
              background: 'var(--card)',
              borderLeft: '1px solid var(--border)',
              zIndex: 91,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>
                {selected.client}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Cerrar"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={DETAIL_LABEL}>Estado</div>
                <span style={pillStyle(appointmentStatusMeta[selected.status], dark)}>
                  {appointmentStatusMeta[selected.status].label}
                </span>
              </div>
              <div>
                <div style={DETAIL_LABEL}>Fecha</div>
                <div style={{ fontSize: 14, textTransform: 'capitalize' }}>
                  {longDate(new Date(`${selected.date}T00:00:00`))}
                </div>
              </div>
              <div>
                <div style={DETAIL_LABEL}>Entrega del vehículo</div>
                <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{selected.time}</div>
              </div>
              <div>
                <div style={DETAIL_LABEL}>Servicios</div>
                <div style={{ fontSize: 14 }}>{selected.service}</div>
              </div>
              <div>
                <div style={DETAIL_LABEL}>Vehículo / patente</div>
                <div style={{ fontSize: 14 }}>
                  {selected.vehicle || '—'} · {selected.plate || 'Sin patente'}
                </div>
              </div>
              <div>
                <div style={DETAIL_LABEL}>Contacto</div>
                <div style={{ fontSize: 14 }}>{selected.phone || '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.email || '—'}</div>
              </div>

              {escribe && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                  <div style={{ ...DETAIL_LABEL, marginBottom: 10 }}>Cambiar estado</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={option.value === selected.status}
                        onClick={() => setStatus(selected.id, option.value)}
                        style={{
                          ...ACTION_BUTTON,
                          padding: '8px 12px',
                          fontSize: 12,
                          opacity: option.value === selected.status ? 0.45 : 1,
                          borderColor:
                            option.value === selected.status ? 'var(--accent)' : 'var(--border)',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {HAS_WHATSAPP && (
                <a
                  href={
                    whatsappHref(
                      `Hola ${selected.client}, te escribimos por tu turno de detailing.`,
                    ) ?? undefined
                  }
                  className="ui-btn"
                  style={{
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    padding: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  Escribir por WhatsApp
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
