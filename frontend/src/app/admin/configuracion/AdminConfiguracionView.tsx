'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiSend, useResource } from '@/lib/api';
import { FIELD } from '@/lib/design';
import { puede } from '@/lib/roles';
import { isEmail } from '@/lib/validation';
import type {
  AgencySettings,
  NotificationKey,
  NotificationPrefs,
  PanelUser,
  UserRole,
} from '@/types';

type Tab = 'general' | 'usuarios' | 'notificaciones';

interface SettingsResponse {
  settings: AgencySettings;
}

interface UsersResponse {
  users: PanelUser[];
}

interface NotificationsResponse {
  prefs: NotificationPrefs;
  defs: { key: NotificationKey; label: string; description: string }[];
}

const LABEL: CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 };

const CARD: CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)' };

const GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
  gap: 14,
};

const USERS_GRID = '1.4fr 1.6fr 120px 110px 90px';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Solo lectura' },
];

const USER_STATUS: Record<PanelUser['status'], { label: string; color: string }> = {
  active: { label: 'Activo', color: '#2F7A4D' },
  pending: { label: 'Invitado', color: '#8A6D3B' },
};

const CAPACITY_MIN = 1;
const CAPACITY_MAX = 50;

export function AdminConfiguracionView({ rol }: { rol: UserRole }) {
  const administra = puede(rol, 'administrar');
  const [tab, setTab] = useState<Tab>('general');
  const toast = useToast();

  const settingsResource = useResource<SettingsResponse>('/api/settings');
  const usersResource = useResource<UsersResponse>(administra ? '/api/settings/users' : null);
  const notificationsResource = useResource<NotificationsResponse>('/api/settings/notifications');

  const [general, setGeneral] = useState<AgencySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');

  useEffect(() => {
    if (settingsResource.data) setGeneral(settingsResource.data.settings);
  }, [settingsResource.data]);

  const setGeneralField =
    (key: keyof AgencySettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setGeneral((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSaved(false);
    };

  function setCapacity(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    setGeneral((prev) => (prev ? { ...prev, detailingDailyCapacity: Number(digits) } : prev));
    setSaved(false);
  }

  const capacityError =
    general &&
    (!Number.isInteger(general.detailingDailyCapacity) ||
      general.detailingDailyCapacity < CAPACITY_MIN ||
      general.detailingDailyCapacity > CAPACITY_MAX)
      ? `Ingresá un número entre ${CAPACITY_MIN} y ${CAPACITY_MAX}.`
      : null;

  async function saveGeneral() {
    if (!general) return;
    if (capacityError) {
      toast.error('Revisá el cupo de turnos', capacityError);
      return;
    }

    setSaving(true);
    try {
      await apiSend('/api/settings', 'PATCH', general);
      setSaved(true);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(
        'No pudimos guardar los cambios',
        err instanceof Error ? err.message : 'Intentá de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite() {
    if (!isEmail(inviteEmail)) {
      toast.error('Email inválido', 'Revisá la dirección antes de enviar la invitación.');
      return;
    }
    try {
      await apiSend('/api/settings/users', 'POST', { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      setInviteOpen(false);
      toast.success('Invitación enviada');
      usersResource.reload();
    } catch (err) {
      toast.error(
        'No pudimos enviar la invitación',
        err instanceof Error ? err.message : 'Intentá de nuevo.',
      );
    }
  }

  async function removeUser(id: string) {
    try {
      await apiSend(`/api/settings/users/${id}`, 'DELETE');
      toast.success('Usuario quitado');
      usersResource.reload();
    } catch (err) {
      toast.error('No pudimos quitar el usuario', err instanceof Error ? err.message : 'Intentá de nuevo.');
    }
  }

  async function toggleNotification(key: NotificationKey, current: boolean) {
    try {
      await apiSend('/api/settings/notifications', 'PATCH', { [key]: !current });
      notificationsResource.reload();
    } catch (err) {
      toast.error(
        'No pudimos cambiar la notificación',
        err instanceof Error ? err.message : 'Intentá de nuevo.',
      );
    }
  }

  const tabStyle = (value: Tab): CSSProperties => ({
    border: 'none',
    background: 'none',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: tab === value ? 'var(--ink)' : 'var(--muted)',
    borderBottom: tab === value ? '2px solid var(--accent)' : '2px solid transparent',
    cursor: 'pointer',
  });

  return (
    <AdminShell
      active="Configuración"
      title={<div style={{ fontSize: 14, fontWeight: 600 }}>Configuración</div>}
      actions={<div />}
    >
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px clamp(16px, 3vw, 24px) 80px' }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            borderBottom: '1px solid var(--border)',
            marginBottom: 28,
            overflowX: 'auto',
          }}
        >
          <button type="button" onClick={() => setTab('general')} style={tabStyle('general')}>
            General
          </button>
          {/* La lista de usuarios es de administradores: el backend la cierra
              con 403, asi que ofrecer la pestana seria prometer un error. */}
          {administra && (
            <button type="button" onClick={() => setTab('usuarios')} style={tabStyle('usuarios')}>
              Usuarios
            </button>
          )}
          <button type="button" onClick={() => setTab('notificaciones')} style={tabStyle('notificaciones')}>
            Notificaciones
          </button>
        </div>

        {tab === 'general' && settingsResource.status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={2} />
          </div>
        )}

        {tab === 'general' && settingsResource.status === 'error' && (
          <ErrorState
            title="No pudimos cargar la configuración."
            detail={settingsResource.error}
            onRetry={settingsResource.reload}
          />
        )}

        {tab === 'general' && general && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ ...CARD, padding: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Datos de la agencia</div>
              <div style={GRID}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="cfg-name" style={LABEL}>
                    Nombre
                  </label>
                  <input id="cfg-name" value={general.name} onChange={setGeneralField('name')} style={FIELD} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="cfg-address" style={LABEL}>
                    Dirección
                  </label>
                  <input
                    id="cfg-address"
                    value={general.address}
                    onChange={setGeneralField('address')}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="cfg-phone" style={LABEL}>
                    Teléfono
                  </label>
                  <input
                    id="cfg-phone"
                    placeholder="A definir"
                    inputMode="tel"
                    value={general.phone}
                    onChange={setGeneralField('phone')}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="cfg-whatsapp" style={LABEL}>
                    WhatsApp
                  </label>
                  <input
                    id="cfg-whatsapp"
                    placeholder="A definir"
                    inputMode="tel"
                    value={general.whatsapp}
                    onChange={setGeneralField('whatsapp')}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="cfg-email" style={LABEL}>
                    Email
                  </label>
                  <input
                    id="cfg-email"
                    type="email"
                    value={general.email}
                    onChange={setGeneralField('email')}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="cfg-instagram" style={LABEL}>
                    Instagram
                  </label>
                  <input
                    id="cfg-instagram"
                    value={general.instagram}
                    onChange={setGeneralField('instagram')}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="cfg-hours-week" style={LABEL}>
                    Horario — lun. a vie.
                  </label>
                  <input
                    id="cfg-hours-week"
                    placeholder="A definir"
                    value={general.hoursWeek}
                    onChange={setGeneralField('hoursWeek')}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="cfg-hours-sat" style={LABEL}>
                    Horario — sábados
                  </label>
                  <input
                    id="cfg-hours-sat"
                    placeholder="A definir"
                    value={general.hoursSat}
                    onChange={setGeneralField('hoursSat')}
                    style={FIELD}
                  />
                </div>
              </div>
            </div>

            {/* Manda el cupo del calendario público: un turno ocupa el día entero. */}
            <div style={{ ...CARD, padding: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Turnos de detailing</div>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Cada turno ocupa el día completo. El cupo define cuántos vehículos se aceptan por día en el
                calendario de reservas.
              </p>
              <div style={GRID}>
                <div>
                  <label htmlFor="cfg-capacity" style={LABEL}>
                    Turnos por día
                  </label>
                  <input
                    id="cfg-capacity"
                    inputMode="numeric"
                    maxLength={2}
                    value={general.detailingDailyCapacity || ''}
                    onChange={(event) => setCapacity(event.target.value)}
                    aria-invalid={capacityError ? true : undefined}
                    aria-describedby="cfg-capacity-hint"
                    style={FIELD}
                  />
                  <div
                    id="cfg-capacity-hint"
                    style={{ fontSize: 12, marginTop: 5, color: capacityError ? 'var(--danger)' : 'var(--muted)' }}
                  >
                    {capacityError ?? `Entre ${CAPACITY_MIN} y ${CAPACITY_MAX}.`}
                  </div>
                </div>
                <div>
                  <label htmlFor="cfg-dropoff" style={LABEL}>
                    Entrega del vehículo
                  </label>
                  <input
                    id="cfg-dropoff"
                    type="time"
                    value={general.detailingDropoff}
                    onChange={setGeneralField('detailingDropoff')}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="cfg-pickup" style={LABEL}>
                    Retiro del vehículo
                  </label>
                  <input
                    id="cfg-pickup"
                    type="time"
                    value={general.detailingPickup}
                    onChange={setGeneralField('detailingPickup')}
                    style={FIELD}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {administra && (
                <button
                  type="button"
                  onClick={saveGeneral}
                  disabled={saving || Boolean(capacityError)}
                  style={{
                    background: saving || capacityError ? 'var(--border)' : 'var(--invert-bg)',
                    color: saving || capacityError ? 'var(--muted)' : 'var(--invert-ink)',
                    border: 'none',
                    padding: '11px 22px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving || capacityError ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              )}
              {saved && <span style={{ fontSize: 12, color: 'var(--ok)' }}>Guardado.</span>}
            </div>
          </div>
        )}

        {tab === 'usuarios' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>Usuarios con acceso al panel</div>
              {administra && (
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  style={{
                    background: 'var(--invert-bg)',
                    color: 'var(--invert-ink)',
                    border: 'none',
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Invitar usuario
                </button>
              )}
            </div>

            {usersResource.status === 'loading' && <SkeletonTable rows={3} rowHeight={38} header={false} />}

            {usersResource.status === 'error' && (
              <ErrorState
                title="No pudimos cargar los usuarios."
                detail={usersResource.error}
                onRetry={usersResource.reload}
              />
            )}

            {usersResource.status === 'ready' && (
              <div style={{ ...CARD, overflowX: 'auto' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: USERS_GRID,
                    gap: 10,
                    minWidth: 640,
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    fontWeight: 600,
                  }}
                >
                  <div>Nombre</div>
                  <div>Email</div>
                  <div>Rol</div>
                  <div>Estado</div>
                  <div>Acciones</div>
                </div>

                {(usersResource.data?.users ?? []).map((user) => (
                  <div
                    key={user.id}
                    className="ui-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: USERS_GRID,
                      gap: 10,
                      minWidth: 640,
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--border2)',
                      alignItems: 'center',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </div>
                    <div>{user.role}</div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: USER_STATUS[user.status].color }}>
                        {USER_STATUS[user.status].label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      style={{
                        border: '1px solid var(--border)',
                        background: 'none',
                        padding: '5px 9px',
                        fontSize: 11,
                        color: 'var(--muted)',
                        cursor: 'pointer',
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {inviteOpen && (
              <div
                className="fadein"
                style={{
                  ...CARD,
                  marginTop: 16,
                  padding: 18,
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label htmlFor="invite-email" style={LABEL}>
                    Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    aria-invalid={inviteEmail.length > 0 && !isEmail(inviteEmail) ? true : undefined}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="invite-role" style={LABEL}>
                    Rol
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                    style={FIELD}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={sendInvite}
                  disabled={!isEmail(inviteEmail)}
                  style={{
                    background: isEmail(inviteEmail) ? 'var(--invert-bg)' : 'var(--border)',
                    color: isEmail(inviteEmail) ? 'var(--invert-ink)' : 'var(--muted)',
                    border: 'none',
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isEmail(inviteEmail) ? 'pointer' : 'not-allowed',
                  }}
                >
                  Enviar invitación
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'notificaciones' && notificationsResource.status === 'loading' && (
          <SkeletonTable rows={4} rowHeight={40} header={false} />
        )}

        {tab === 'notificaciones' && notificationsResource.status === 'error' && (
          <ErrorState
            title="No pudimos cargar las notificaciones."
            detail={notificationsResource.error}
            onRetry={notificationsResource.reload}
          />
        )}

        {tab === 'notificaciones' && notificationsResource.data && (
          <div style={CARD}>
            {notificationsResource.data.defs.map((def) => {
              const on = notificationsResource.data!.prefs[def.key];
              return (
                <div
                  key={def.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 18px',
                    borderBottom: '1px solid var(--border2)',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{def.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{def.description}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={def.label}
                    onClick={() => toggleNotification(def.key, on)}
                    disabled={!administra}
                    style={{
                      width: 38,
                      height: 22,
                      borderRadius: 11,
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                      background: on ? 'var(--accent)' : 'var(--border2)',
                      position: 'relative',
                      cursor: 'pointer',
                      padding: 2,
                      flexShrink: 0,
                      transition: 'background-color 0.18s ease, border-color 0.18s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: on ? '#FFFFFF' : 'var(--muted)',
                        transform: on ? 'translateX(16px)' : 'translateX(0)',
                        transition:
                          'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.18s ease',
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
