'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiSend, useResource } from '@/lib/api';
import { canalDeRespuesta } from '@/app/admin/consultas/responder';
import { FIELD, leadStatusMeta, pillStyle } from '@/lib/design';
import { useIsNarrow } from '@/lib/hooks';
import { puede } from '@/lib/roles';
import { useTheme } from '@/lib/theme';
import type { Lead, LeadStatus, UserRole } from '@/types';

interface LeadsResponse {
  leads: Lead[];
}

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'negotiating', label: 'En negociación' },
  { value: 'closed', label: 'Cerrado' },
  { value: 'discarded', label: 'Descartado' },
];

const SELECT: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--ink)',
  padding: '10px 12px',
  fontSize: 13,
  width: '100%',
};

const FIELD_LABEL: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 8,
};

/** La fecha del lead viaja como ISO; para comparar alcanza con el día. */
function leadDay(lead: Lead): string {
  return lead.createdAt.slice(0, 10);
}

export function AdminConsultasView({ rol }: { rol: UserRole }) {
  const escribe = puede(rol, 'escribir');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [dateFilter, setDateFilter] = useState('');

  const { dark } = useTheme();
  const toast = useToast();
  const isMobile = useIsNarrow(900);

  const { data, status, error, reload } = useResource<LeadsResponse>('/api/leads');
  const leads = useMemo(() => data?.leads ?? [], [data]);

  /** Nombre libre + estado + día, combinables entre sí. */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (dateFilter && leadDay(lead) !== dateFilter) return false;
      if (!term) return true;
      return [lead.name, lead.vehicle, lead.contact, lead.origin, lead.message]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [leads, search, statusFilter, dateFilter]);

  const selected = filtered.find((lead) => lead.id === selectedId) ?? null;
  const draft = selectedId ? (drafts[selectedId] ?? '') : '';
  /* A donde va la respuesta lo decide el origen de la consulta, no el empleado. */
  const canal = selected ? canalDeRespuesta(selected, draft.trim()) : null;
  const filtersActive = Boolean(search.trim()) || statusFilter !== 'all' || Boolean(dateFilter);

  async function changeStatus(id: string, next: LeadStatus) {
    try {
      await apiSend(`/api/leads/${id}`, 'PATCH', { status: next });
      toast.success('Consulta actualizada', leadStatusMeta[next].label);
      reload();
    } catch (err) {
      toast.error(
        'No pudimos cambiar el estado',
        err instanceof Error ? err.message : 'Intentá de nuevo.',
      );
    }
  }

  /*
   * Deliberadamente sin `await`: esto corre en el `onClick` de un `<a>` que abre
   * WhatsApp o el cliente de correo. Si esperara la respuesta del PATCH antes de
   * navegar, el navegador ya habria perdido el gesto del usuario y el bloqueador
   * de pop-ups se comeria la pestaña.
   */
  function registrarRespuesta() {
    const id = selectedId;
    const texto = draft.trim();
    if (!id || !texto) return;
    setSending(true);
    apiSend(`/api/leads/${id}`, 'PATCH', { reply: texto })
      .then(() => {
        setDrafts((prev) => ({ ...prev, [id]: '' }));
        toast.success('Respuesta registrada', 'Confirmá que el mensaje haya salido.');
        reload();
      })
      .catch((err: unknown) => {
        toast.error(
          'No pudimos registrar la respuesta',
          err instanceof Error ? err.message : 'Intentá de nuevo.',
        );
      })
      .finally(() => setSending(false));
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('');
  }

  const detailPanelStyle: CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 91,
        background: 'var(--card)',
        padding: 24,
        overflowY: 'auto',
      }
    : {
        width: 'min(380px, 40vw)',
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--card)',
        padding: 24,
        position: 'sticky',
        top: 60,
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 60px)',
        overflowY: 'auto',
      };

  return (
    <AdminShell active="Consultas" title={<div style={{ fontSize: 14, fontWeight: 600 }}>Consultas</div>}>
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, padding: 'clamp(16px, 3vw, 24px)' }}>
          {/* FILTROS */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, vehículo o mensaje…"
              aria-label="Buscar consultas"
              style={{ ...FIELD, minWidth: 200, flex: 1, maxWidth: 340 }}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | LeadStatus)}
              style={{ ...FIELD, width: 'auto' }}
              aria-label="Estado de la consulta"
            >
              <option value="all">Estado — Todos</option>
              {LEAD_STATUSES.map((option) => (
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
              {status === 'loading' ? 'Cargando…' : `${filtered.length} consultas`}
            </div>
          </div>

          {status === 'loading' && <SkeletonTable rows={6} rowHeight={52} header={false} />}

          {status === 'error' && (
            <ErrorState title="No pudimos cargar las consultas." detail={error} onRetry={reload} />
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
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sin consultas</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {filtersActive
                  ? 'Ninguna consulta coincide con los filtros.'
                  : 'Todavía no llegaron consultas.'}
              </div>
            </div>
          )}

          {status === 'ready' && filtered.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                background: 'var(--border)',
                border: '1px solid var(--border)',
              }}
            >
              {filtered.map((lead) => {
                const meta = leadStatusMeta[lead.status];
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedId(lead.id)}
                    aria-pressed={selectedId === lead.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      background: selectedId === lead.id ? 'var(--bg)' : 'var(--card)',
                      color: 'var(--ink)',
                      border: 'none',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{lead.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {lead.vehicle} · {lead.origin}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                        {lead.date}
                      </span>
                      <span style={pillStyle(meta, dark)}>{meta.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div role={isMobile ? 'dialog' : undefined} aria-label="Detalle de la consulta" style={detailPanelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>
                {selected.name}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Cerrar"
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--muted)' }}>Contacto:</span> {selected.contact}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Vehículo consultado:</span> {selected.vehicle}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Origen:</span> {selected.origin}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Fecha:</span> {selected.date}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Mensaje:</span> {selected.message}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={FIELD_LABEL}>{escribe ? 'Categorizar lead' : 'Estado'}</div>
              <select
                value={selected.status}
                onChange={(event) => changeStatus(selected.id, event.target.value as LeadStatus)}
                style={SELECT}
                aria-label="Estado del lead"
                disabled={!escribe}
              >
                {LEAD_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Responder hace PATCH del lead: no se le ofrece a quien solo mira. */}
            {escribe && (
              <div style={{ marginTop: 20 }}>
                <div style={FIELD_LABEL}>Responder</div>
                {selected.reply ? (
                  <div
                    style={{
                      background: '#EFF6F0',
                      border: '1px solid #CFE6D3',
                      color: '#2F7A4D',
                      fontSize: 12,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      Respuesta registrada. El lead pasó a &quot;Contactado&quot;.
                    </div>
                    {/* El panel no envía nada: dice lo que de verdad pasó, para que
                        nadie de por hecho que el cliente ya la recibió. */}
                    <div style={{ marginTop: 4 }}>
                      Se abrió el canal del cliente con este texto cargado. El mensaje lo manda una
                      persona.
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: '1px solid #CFE6D3',
                        color: '#24503A',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {selected.reply}
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      rows={4}
                      placeholder="Escribí tu respuesta…"
                      value={draft}
                      onChange={(event) =>
                        setDrafts((prev) => ({ ...prev, [selected.id]: event.target.value }))
                      }
                      style={{ ...SELECT, resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {canal?.href && draft.trim() ? (
                        <a
                          href={canal.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={registrarRespuesta}
                          className="ui-btn"
                          style={{
                            border: 'none',
                            background: 'var(--invert-bg)',
                            color: 'var(--invert-ink)',
                            padding: '10px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          {sending ? 'Registrando…' : canal.etiqueta}
                        </a>
                      ) : (
                        <span
                          style={{
                            border: 'none',
                            background: 'var(--border)',
                            color: 'var(--muted)',
                            padding: '10px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {canal?.etiqueta ?? 'Responder'}
                        </span>
                      )}
                    </div>
                    {canal?.motivo ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                        {canal.motivo}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
