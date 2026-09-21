'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { AdminBreadcrumb, AdminShell } from '@/components/admin/AdminShell';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';
import { useResource } from '@/lib/api';
import { appointmentStatusMeta, nextAppointmentAction } from '@/lib/design';
import { initials, longDate, timeAgo } from '@/lib/format';
import { useIsNarrow, useKeydown } from '@/lib/hooks';
import type {
  ActionAlert,
  ActionAlertType,
  ActivityEntry,
  AdminNotification,
  AppointmentStatus,
  BusinessMetric,
  PanelUser,
  StockSummary,
  VehicleAlert,
} from '@/types';

interface DashboardLead {
  id: string;
  customerName: string;
  source: string;
  vehicle: string;
  message: string;
  minsAgo: number;
  status: string;
}

interface TodayAppointment {
  id: string;
  time: string;
  customerName: string;
  vehicle: string;
  service: string;
  status: AppointmentStatus;
}

interface DashboardResponse {
  alerts: ActionAlert[];
  vehicleAlerts: VehicleAlert[];
  activity: ActivityEntry[];
  notifications: AdminNotification[];
  stock: StockSummary;
  businessMetrics: BusinessMetric[];
  todayAppointments: TodayAppointment[];
  leads: DashboardLead[];
}

const SECTION_TITLE: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 12,
};

const CARD: CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)' };

const ALERT_DOT: Record<ActionAlertType, string> = {
  urgent: 'var(--accent)',
  important: '#8A6D3B',
  pending: 'var(--muted)',
};

const LEAD_TONE: Record<string, string> = {
  new: '#E2610A',
  contacted: '#3A5A9B',
  negotiating: '#8A6D3B',
  closed: '#2F7A4D',
  discarded: '#6B6560',
};

const LEAD_LABEL: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  negotiating: 'En negociación',
  closed: 'Cerrado',
  discarded: 'Descartado',
};

const COMMANDS = [
  { label: 'Agregar vehículo', hint: 'N', href: '/admin/vehiculos' },
  { label: 'Ver consultas', hint: 'C', href: '/admin/consultas' },
  { label: 'Ir a Detailing', hint: 'D', href: '/admin/detailing' },
  { label: 'Ir a Stock', hint: 'S', href: '/admin/vehiculos' },
  { label: 'Ver calendario de turnos', hint: '', href: '/admin/detailing' },
  { label: 'Registrar gasto', hint: '', href: '/admin/vehiculos' },
];

const QUICK_ACTIONS = [
  { label: '+ Agregar vehículo', href: '/admin/vehiculos' },
  { label: '+ Crear turno', href: '/admin/detailing' },
  { label: 'Ver consultas', href: '/admin/consultas' },
  { label: 'Ver calendario', href: '/admin/detailing' },
  { label: 'Ver stock', href: '/admin/vehiculos' },
  { label: 'Registrar gasto', href: '/admin/vehiculos' },
];

const LEADS_GRID = '160px 100px 160px 90px 130px';

export function AdminDashboardView({ usuario }: { usuario: PanelUser }) {
  const { data, status, error, reload } = useResource<DashboardResponse>('/api/admin/dashboard');
  const isMobile = useIsNarrow(900);

  const [notifsOpen, setNotifsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, AppointmentStatus>>({});

  useKeydown(
    useCallback((event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
        setNotifsOpen(false);
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
        setNotifsOpen(false);
      }
    }, []),
  );

  const todayLabel = useMemo(() => longDate(new Date()), []);

  const appointments = (data?.todayAppointments ?? []).map((appointment) => ({
    ...appointment,
    status: overrides[appointment.id] ?? appointment.status,
  }));

  const summary = {
    total: appointments.length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    inProgress: appointments.filter((a) => a.status === 'in_progress').length,
  };

  const nextAppointment = appointments.find((a) => a.status === 'pending' || a.status === 'confirmed');

  const pendingLeads = (data?.leads ?? [])
    .filter((lead) => lead.status === 'new')
    .sort((a, b) => a.minsAgo - b.minsAgo)
    .slice(0, 4);

  const commandResults = commandQuery
    ? COMMANDS.filter((command) => command.label.toLowerCase().includes(commandQuery.toLowerCase()))
    : COMMANDS;

  const loading = status === 'loading';

  return (
    <AdminShell
      usuario={usuario}
      active="Dashboard"
      title={<AdminBreadcrumb section="Dashboard" />}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              setCommandOpen(true);
              setNotifsOpen(false);
            }}
            style={{
              display: isMobile ? 'none' : 'flex',
              flex: 1,
              maxWidth: 360,
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            <span>Buscar vehículos, clientes, turnos…</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                border: '1px solid var(--border)',
                padding: '1px 5px',
                borderRadius: 2,
                background: 'var(--card)',
              }}
            >
              ⌘K
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setNotifsOpen((open) => !open);
                  setCommandOpen(false);
                }}
                aria-label="Notificaciones"
                aria-expanded={notifsOpen}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  position: 'relative',
                }}
              >
                Notificaciones
                <span
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 7,
                    height: 7,
                    background: 'var(--accent)',
                    borderRadius: '50%',
                  }}
                />
              </button>

              {notifsOpen && (
                <div
                  className="fadein"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 30,
                    width: 300,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 30px rgba(23,21,18,0.12)',
                    zIndex: 40,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderBottom: '1px solid var(--border2)',
                    }}
                  >
                    Notificaciones
                  </div>
                  {(data?.notifications ?? []).map((notification) => (
                    <div
                      key={notification.text}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border2)',
                        fontSize: 13,
                      }}
                    >
                      <div>{notification.text}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                        {notification.time}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--invert-bg)',
                  color: 'var(--invert-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                FR
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Francisco</span>
            </div>
          </div>
        </>
      }
    >
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '28px clamp(16px, 3vw, 24px) 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(24px, 4vw, 36px)',
        }}
      >
        {status === 'error' && (
          <ErrorState
            title="No pudimos cargar el panel."
            detail={error}
            onRetry={reload}
          />
        )}

        {/* SALUDO */}
        <div>
          <h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '0 0 4px' }}
          >
            Buenos días, Francisco.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Esto es lo que está pasando hoy en 5848 Motors ·{' '}
            <span style={{ textTransform: 'capitalize' }}>{todayLabel}</span>
          </p>
        </div>

        {/* REQUIERE ATENCIÓN */}
        <div>
          <div style={SECTION_TITLE}>Requiere tu atención</div>
          {(data?.alerts.length ?? 0) > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                background: 'var(--border)',
                border: '1px solid var(--border)',
              }}
            >
              {data?.alerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  style={{
                    background: 'var(--card)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    color: 'var(--ink)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: ALERT_DOT[alert.type],
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{alert.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{alert.description}</div>
                    </div>
                  </div>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {alert.actionLabel} →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ ...CARD, padding: 22, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Todo al día</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>No tenés acciones pendientes.</div>
            </div>
          )}
        </div>

        {/* DETAILING HOY */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <div style={{ ...SECTION_TITLE, marginBottom: 0 }}>Detailing · Hoy</div>
            <Link href="/admin/detailing" style={{ fontSize: 12, fontWeight: 600 }}>
              Ver calendario →
            </Link>
          </div>

          {loading && (
            <div style={{ ...CARD, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton width="40%" height={14} />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          )}

          {status === 'ready' && appointments.length > 0 && (
            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  flexWrap: 'wrap',
                  fontSize: 12,
                  color: 'var(--muted)',
                  marginBottom: 16,
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--border2)',
                }}
              >
                <span>
                  <strong style={{ color: 'var(--ink)' }}>{summary.total}</strong> turnos
                </span>
                <span>
                  <strong style={{ color: '#2F7A4D' }}>{summary.confirmed}</strong> confirmados
                </span>
                <span>
                  <strong style={{ color: '#8A6D3B' }}>{summary.pending}</strong> pendientes
                </span>
                <span>
                  <strong style={{ color: '#3A5A9B' }}>{summary.inProgress}</strong> en proceso
                </span>
              </div>

              {nextAppointment && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg)',
                    padding: '12px 14px',
                    marginBottom: 14,
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--muted)',
                        marginBottom: 2,
                      }}
                    >
                      Próximo turno · {nextAppointment.time}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {nextAppointment.vehicle} — {nextAppointment.service}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{nextAppointment.customerName}</div>
                  </div>
                  <Link
                    href="/admin/detailing"
                    style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    Ver turno →
                  </Link>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {appointments.map((appointment) => {
                  const meta = appointmentStatusMeta[appointment.status];
                  const action = nextAppointmentAction[appointment.status];
                  return (
                    <div key={appointment.id}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '58px minmax(0, 1fr) auto',
                          gap: 12,
                          padding: '12px 0',
                          borderTop: '1px solid var(--border2)',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                          {appointment.time}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {appointment.customerName}{' '}
                            <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                              — {appointment.vehicle}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {appointment.service} · <span style={{ color: meta.color }}>{meta.label}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {action && (
                            <button
                              type="button"
                              onClick={() =>
                                setOverrides((prev) => ({ ...prev, [appointment.id]: action.next }))
                              }
                              style={{
                                border: '1px solid var(--border)',
                                background: 'var(--card)',
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {action.label}
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Más acciones"
                            onClick={() =>
                              setOpenMenus((prev) => ({ ...prev, [appointment.id]: !prev[appointment.id] }))
                            }
                            style={{
                              border: 'none',
                              background: 'none',
                              fontSize: 15,
                              color: 'var(--muted)',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                          >
                            ⋯
                          </button>
                        </div>
                      </div>

                      {openMenus[appointment.id] && (
                        <div
                          style={{ display: 'flex', gap: 8, padding: '0 0 10px 72px', flexWrap: 'wrap' }}
                        >
                          <button
                            type="button"
                            style={{
                              border: '1px solid var(--border)',
                              background: 'none',
                              padding: '5px 10px',
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                          >
                            Reprogramar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setOverrides((prev) => ({ ...prev, [appointment.id]: 'cancelled' }))
                            }
                            style={{
                              border: '1px solid var(--border)',
                              background: 'none',
                              padding: '5px 10px',
                              fontSize: 11,
                              color: 'var(--accent)',
                              cursor: 'pointer',
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {status === 'ready' && appointments.length === 0 && (
            <div style={{ ...CARD, padding: 22, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              No hay turnos de detailing para hoy.
            </div>
          )}
        </div>

        {/* CONSULTAS PENDIENTES */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <div style={{ ...SECTION_TITLE, marginBottom: 0 }}>Consultas pendientes</div>
            <Link href="/admin/consultas" style={{ fontSize: 12, fontWeight: 600 }}>
              Ver todas →
            </Link>
          </div>

          {loading && (
            <div style={{ ...CARD, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ height: 40, background: 'var(--border2)' }} />
              <div style={{ height: 40, background: 'var(--border2)' }} />
            </div>
          )}

          {status === 'ready' && pendingLeads.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                background: 'var(--border)',
                border: '1px solid var(--border)',
              }}
            >
              {pendingLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    background: 'var(--card)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'var(--border2)',
                      color: 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {initials(lead.customerName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {lead.customerName}{' '}
                      <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— {lead.vehicle}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lead.message}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: lead.minsAgo < 5 ? 'var(--accent)' : 'var(--muted)',
                        fontWeight: lead.minsAgo < 5 ? 700 : 400,
                        marginBottom: 3,
                      }}
                    >
                      {timeAgo(lead.minsAgo)}
                    </div>
                    <Link href="/admin/consultas" style={{ fontSize: 12, fontWeight: 600 }}>
                      Responder
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === 'ready' && pendingLeads.length === 0 && (
            <div style={{ ...CARD, padding: 22, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              No hay consultas pendientes. Todo está al día.
            </div>
          )}
        </div>

        {/* LEADS RECIENTES */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <div style={{ ...SECTION_TITLE, marginBottom: 0 }}>Leads recientes</div>
            <Link href="/admin/consultas" style={{ fontSize: 12, fontWeight: 600 }}>
              Ver todos →
            </Link>
          </div>
          {loading && <SkeletonTable rows={4} rowHeight={34} header={false} />}
          {status === 'ready' && (
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: LEADS_GRID,
                gap: 12,
                minWidth: 640,
                padding: '10px 16px',
                borderBottom: '1px solid var(--border2)',
                fontSize: 11,
                textTransform: 'uppercase',
                color: 'var(--muted)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <div>Nombre</div>
              <div>Origen</div>
              <div>Interés</div>
              <div>Fecha</div>
              <div>Estado</div>
            </div>
            {(data?.leads ?? []).map((lead) => (
              <div
                key={lead.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: LEADS_GRID,
                  gap: 12,
                  minWidth: 640,
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border2)',
                  alignItems: 'center',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ fontWeight: 600 }}>{lead.customerName}</div>
                <div style={{ color: 'var(--muted)' }}>{lead.source}</div>
                <div style={{ color: 'var(--muted)' }}>{lead.vehicle}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {lead.minsAgo < 1440 ? 'Hoy' : 'Ayer'}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: LEAD_TONE[lead.status] ?? LEAD_TONE.contacted,
                    }}
                  >
                    {LEAD_LABEL[lead.status] ?? LEAD_LABEL.contacted}
                  </span>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* VEHÍCULOS QUE REQUIEREN ATENCIÓN */}
        <div>
          <div style={SECTION_TITLE}>Vehículos que requieren atención</div>

          {loading && (
            <div style={{ ...CARD, padding: 16 }}>
              <Skeleton height={40} />
            </div>
          )}

          {status === 'error' && (
            <div style={{ ...CARD, padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
                No pudimos cargar las alertas de vehículos.
              </p>
              <button
                type="button"
                onClick={reload}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reintentar
              </button>
            </div>
          )}

          {status === 'ready' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                background: 'var(--border)',
                border: '1px solid var(--border)',
              }}
            >
              {data?.vehicleAlerts.map((alert) => (
                <Link
                  key={alert.vehicle}
                  href="/admin/vehiculos"
                  style={{
                    background: 'var(--card)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    color: 'var(--ink)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{alert.vehicle}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{alert.issue}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {alert.actionLabel} →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ACTIVIDAD RECIENTE */}
        <div>
          <div style={SECTION_TITLE}>Actividad reciente</div>
          <div style={{ ...CARD, padding: '16px 18px' }}>
            {(data?.activity ?? []).map((entry) => (
              <div
                key={`${entry.time}-${entry.text}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr',
                  gap: 12,
                  padding: '9px 0',
                  borderTop: '1px solid var(--border2)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                  {entry.time}
                </div>
                <div style={{ fontSize: 13 }}>{entry.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* STOCK + NEGOCIO */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}
        >
          <div style={{ ...CARD, padding: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Stock</div>
            <div style={{ display: 'flex', gap: 18, fontSize: 13, flexWrap: 'wrap' }}>
              <span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{data?.stock.total ?? '—'}</strong>{' '}
                vehículos
              </span>
              <span style={{ color: '#2F7A4D' }}>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{data?.stock.available ?? '—'}</strong>{' '}
                disponibles
              </span>
              <span style={{ color: 'var(--accent)' }}>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{data?.stock.reserved ?? '—'}</strong>{' '}
                reservados
              </span>
              <span style={{ color: 'var(--muted)' }}>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{data?.stock.sold ?? '—'}</strong>{' '}
                vendidos
              </span>
            </div>
            <Link
              href="/admin/vehiculos"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, marginTop: 12 }}
            >
              Gestionar stock →
            </Link>
          </div>

          <div style={{ ...CARD, padding: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Negocio</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.businessMetrics ?? []).map((metric) => (
                <div
                  key={metric.label}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 12 }}
                >
                  <span style={{ color: 'var(--muted)' }}>{metric.label}</span>
                  <span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{metric.value}</strong>
                    {metric.delta && (
                      <span
                        style={{
                          fontSize: 11,
                          color: metric.deltaTone === 'negative' ? 'var(--accent)' : '#2F7A4D',
                          marginLeft: 6,
                        }}
                      >
                        {metric.delta}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ACCIONES RÁPIDAS */}
        <div>
          <div style={SECTION_TITLE}>Acciones rápidas</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  padding: '9px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* COMMAND MENU */}
      {commandOpen && (
        <div
          role="presentation"
          onClick={() => {
            setCommandOpen(false);
            setCommandQuery('');
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16,15,13,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
          }}
        >
          <div
            role="dialog"
            aria-label="Buscar o ejecutar una acción"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(520px, 92vw)',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 60px rgba(23,21,18,0.25)',
            }}
          >
            <input
              autoFocus
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="Buscar o ejecutar una acción…"
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                padding: '16px 18px',
                fontSize: 14,
                outline: 'none',
                background: 'var(--card)',
                color: 'var(--ink)',
              }}
            />
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {commandResults.map((command) => (
                <Link
                  key={command.label}
                  href={command.href}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    fontSize: 13,
                    color: 'var(--ink)',
                    borderBottom: '1px solid var(--border2)',
                  }}
                >
                  <span>{command.label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{command.hint}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
