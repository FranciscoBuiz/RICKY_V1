'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { DarkToggle } from '@/components/site/DarkToggle';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiSend } from '@/lib/api';
import { EYEBROW, H2, PAGE_TITLE } from '@/lib/design';
import { displayPhone, fieldsValid, focusFirstInvalid } from '@/lib/fields';
import { useWizardStep } from '@/lib/hooks';
import { isoDate, longDate, weekdayShort } from '@/lib/format';
import type { DayAvailability, DetailingService } from '@/types';

interface ServicesResponse {
  services: DetailingService[];
  simple: string[];
  extras: string[];
}

interface AvailabilityResponse {
  days: DayAvailability[];
  dropoff: string;
  pickup: string;
  capacity: number;
}

const STEP_LABELS = ['Servicio', 'Fecha', 'Datos'];
const DAYS_AHEAD = 14;
const SKELETON_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

type LoadStatus = 'loading' | 'error' | 'ready';

interface ClientData {
  name: string;
  phone: string;
  email: string;
  plate: string;
}

const EMPTY_CLIENT: ClientData = { name: '', phone: '', email: '', plate: '' };

export function TurnoView() {
  const params = useSearchParams();
  const toast = useToast();

  // `?modo=simplificado` acorta el catálogo de servicios; `?multiple=0` vuelve
  // a la selección de un solo servicio. Por defecto se pueden elegir varios.
  const simplified = params.get('modo') === 'simplificado';
  const allowMultiple = params.get('multiple') !== '0';

  const [step, setStep] = useWizardStep(3);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [client, setClient] = useState<ClientData>(EMPTY_CLIENT);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [catalog, setCatalog] = useState<ServicesResponse | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<LoadStatus>('loading');

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<LoadStatus>('loading');

  const loadCatalog = useCallback(async () => {
    setCatalogStatus('loading');
    try {
      setCatalog(await apiGet<ServicesResponse>('/api/services'));
      setCatalogStatus('ready');
    } catch {
      setCatalogStatus('error');
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    setAvailabilityStatus('loading');
    try {
      const from = isoDate(new Date());
      setAvailability(
        await apiGet<AvailabilityResponse>(`/api/appointments/availability?from=${from}&days=${DAYS_AHEAD}`),
      );
      setAvailabilityStatus('ready');
    } catch {
      setAvailabilityStatus('error');
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadAvailability();
  }, [loadCatalog, loadAvailability]);

  const baseNames = simplified
    ? (catalog?.simple ?? [])
    : (catalog?.services.map((service) => service.name) ?? []);
  const extraNames = simplified ? (catalog?.extras ?? []) : [];

  const days = useMemo(() => availability?.days ?? [], [availability]);
  const selectedDay = days.find((day) => day.date === date) ?? null;

  function toggleService(name: string, exclusive: boolean) {
    setSelectedServices((prev) => {
      if (exclusive) return [name, ...prev.filter((item) => extraNames.includes(item))];
      return prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name];
    });
  }

  const selectionStyle = (active: boolean): CSSProperties => ({
    border: '1px solid var(--border)',
    outline: active ? '2px solid var(--accent)' : 'none',
    outlineOffset: -2,
    background: active ? 'var(--accent-soft)' : 'none',
    padding: 14,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--ink)',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  });

  const clientValid =
    fieldsValid([
      { kind: 'name', value: client.name, required: true },
      { kind: 'phone', value: client.phone, required: true },
      { kind: 'plate', value: client.plate, required: true },
      { kind: 'email', value: client.email },
    ]);

  /** Lo que falta para poder avanzar desde el paso actual, o `null` si está listo. */
  const stepBlocker: string | null =
    step === 1 && selectedServices.length === 0
      ? 'Elegí al menos un servicio para continuar.'
      : step === 2 && availabilityStatus !== 'ready'
        ? 'Estamos cargando la disponibilidad.'
        : step === 2 && date === null
          ? 'Elegí una fecha con lugar disponible.'
          : step === 3 && !clientValid
            ? 'Completá los campos marcados para confirmar.'
            : null;

  async function goNext() {
    // El botón queda habilitado a propósito: si falta algo, hay que decir qué.
    if (stepBlocker) {
      if (step === 3) {
        setShowErrors(true);
        focusFirstInvalid();
      }
      toast.error('Falta un dato', stepBlocker);
      return;
    }

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (!date) return;

    setSaving(true);
    try {
      await apiSend('/api/appointments', 'POST', {
        client: client.name.trim(),
        service: selectedServices.join(', '),
        date,
        phone: displayPhone(client.phone),
        email: client.email.trim(),
        plate: client.plate,
      });
      setConfirmed(true);
      toast.success('Turno solicitado', 'Te escribimos para confirmarlo.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Probá de nuevo en unos minutos.';
      toast.error('No pudimos reservar el turno', message);
      // Si se llenó el cupo mientras completaba los datos, hay que reelegir día.
      loadAvailability();
      setStep(2);
      setDate(null);
    } finally {
      setSaving(false);
    }
  }

  const dropoff = availability?.dropoff ?? '09:00';
  const pickup = availability?.pickup ?? '18:00';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--header-bg)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--shell)',
            margin: '0 auto',
            padding: '0 var(--gutter)',
            height: 76,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Link
            href="/"
            className="ui-link"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 18,
              color: 'var(--ink)',
            }}
          >
            5848<span style={{ color: 'var(--accent)', fontSize: 13, letterSpacing: '0.06em' }}> MOTORS</span>
          </Link>
          <Link
            href="/detailing"
            className="ui-link"
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}
          >
            Volver a Detailing
          </Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '64px var(--gutter) 24px' }}>
          <div style={{ ...EYEBROW, marginBottom: 14 }}>Reservar turno</div>
          <h1 style={PAGE_TITLE}>
            Coordiná tu turno de detailing
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', margin: '14px 0 0', lineHeight: 1.6 }}>
            El turno ocupa el día completo: dejás el vehículo a las {dropoff} y lo retirás a las {pickup}.
          </p>
        </section>

        {!confirmed && (
          <>
            <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 var(--gutter) 8px' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {STEP_LABELS.map((label, index) => {
                  const n = index + 1;
                  return (
                    <div key={label} style={{ flex: 1 }}>
                      <div
                        style={{
                          height: 3,
                          background: n <= step ? 'var(--accent)' : 'var(--border)',
                          marginBottom: 8,
                          transition: 'background-color 0.3s ease',
                        }}
                      />
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: n === step ? 'var(--ink)' : 'var(--muted)',
                          fontWeight: n === step ? 700 : 500,
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ maxWidth: 760, margin: '0 auto', padding: '32px var(--gutter) 96px' }}>
              <div
                style={{
                  border: '1px solid var(--border)',
                  padding: 'clamp(20px, 5vw, 44px)',
                  minHeight: 320,
                }}
              >
                {step === 1 && (
                  <div className="fadein">
                    <h2 style={STEP_TITLE}>Elegí los servicios</h2>
                    <p style={STEP_HINT}>
                      {allowMultiple
                        ? 'Podés combinar todos los que necesites en un mismo turno.'
                        : 'Elegí el servicio principal del turno.'}
                    </p>

                    {catalogStatus === 'loading' && (
                      <div style={OPTION_GRID}>
                        {[0, 1, 2, 3, 4, 5].map((cell) => (
                          <Skeleton key={cell} height={50} />
                        ))}
                      </div>
                    )}

                    {catalogStatus === 'error' && (
                      <ErrorState
                        title="No pudimos cargar los servicios."
                        onRetry={loadCatalog}
                        variant="page"
                      />
                    )}

                    {catalogStatus === 'ready' && (
                      <>
                        <div style={OPTION_GRID}>
                          {baseNames.map((name) => {
                            const active = selectedServices.includes(name);
                            return (
                              <button
                                key={name}
                                type="button"
                                aria-pressed={active}
                                onClick={() => toggleService(name, !allowMultiple)}
                                style={selectionStyle(active)}
                              >
                                <Check active={active} round={!allowMultiple} />
                                {name}
                              </button>
                            );
                          })}
                        </div>

                        {extraNames.length > 0 && (
                          <div style={{ marginTop: 24 }}>
                            <div style={GROUP_LABEL}>Servicios extra</div>
                            <div style={OPTION_GRID}>
                              {extraNames.map((name) => {
                                const active = selectedServices.includes(name);
                                return (
                                  <button
                                    key={name}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => toggleService(name, false)}
                                    style={selectionStyle(active)}
                                  >
                                    <Check active={active} />
                                    {name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {selectedServices.length > 0 && (
                          <div style={{ marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
                            Seleccionados: <strong style={{ color: 'var(--ink)' }}>{selectedServices.join(', ')}</strong>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="fadein">
                    <h2 style={STEP_TITLE}>Elegí la fecha</h2>
                    <p style={STEP_HINT}>
                      Cada día toma hasta {availability?.capacity ?? '—'} vehículos. Los días completos aparecen
                      deshabilitados.
                    </p>

                    {availabilityStatus === 'loading' && (
                      <div style={DAY_GRID}>
                        {SKELETON_CELLS.map((cell) => (
                          <Skeleton key={cell} height={78} />
                        ))}
                      </div>
                    )}

                    {availabilityStatus === 'error' && (
                      <ErrorState
                        title="No pudimos cargar las fechas disponibles."
                        onRetry={loadAvailability}
                        variant="page"
                      />
                    )}

                    {availabilityStatus === 'ready' && (
                      <div style={DAY_GRID}>
                        {days.map((day) => {
                          const parsed = new Date(`${day.date}T00:00:00`);
                          const selected = day.date === date;
                          const left = Math.max(0, day.capacity - day.booked);
                          return (
                            <button
                              key={day.date}
                              type="button"
                              disabled={!day.available}
                              aria-pressed={selected}
                              onClick={() => setDate(day.date)}
                              style={{
                                border: '1px solid var(--border)',
                                outline: selected ? '2px solid var(--accent)' : 'none',
                                outlineOffset: -2,
                                background: !day.available
                                  ? 'var(--border2)'
                                  : selected
                                    ? 'var(--accent-soft)'
                                    : 'none',
                                color: day.available ? 'var(--ink)' : 'var(--muted)',
                                padding: '10px 4px',
                                textAlign: 'center',
                                cursor: day.available ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.7 }}>
                                {weekdayShort(parsed)}
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 700 }}>{parsed.getDate()}</div>
                              <div style={{ fontSize: 10, marginTop: 4, color: 'var(--muted)' }}>
                                {day.available ? `${left} lugar${left === 1 ? '' : 'es'}` : 'Completo'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedDay && (
                      <div
                        style={{
                          marginTop: 20,
                          border: '1px solid var(--border)',
                          background: 'var(--accent-soft)',
                          padding: 14,
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        Dejá el vehículo el{' '}
                        <strong>{longDate(new Date(`${selectedDay.date}T00:00:00`))}</strong> a las {dropoff} y
                        retiralo a partir de las {pickup}.
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="fadein">
                    <h2 style={STEP_TITLE}>Tus datos</h2>
                    <p style={STEP_HINT}>Los campos con * son obligatorios.</p>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                        gap: 16,
                      }}
                    >
                      <TextField
                        label="Nombre y apellido"
                        kind="name"
                        required
                        value={client.name}
                        onChange={(value) => setClient((prev) => ({ ...prev, name: value }))}
                        showError={showErrors}
                      />
                      <TextField
                        label="Teléfono"
                        kind="phone"
                        required
                        value={client.phone}
                        onChange={(value) => setClient((prev) => ({ ...prev, phone: value }))}
                        showError={showErrors}
                      />
                      <TextField
                        label="Email"
                        kind="email"
                        value={client.email}
                        onChange={(value) => setClient((prev) => ({ ...prev, email: value }))}
                        showError={showErrors}
                      />
                      <TextField
                        label="Patente"
                        kind="plate"
                        required
                        value={client.plate}
                        onChange={(value) => setClient((prev) => ({ ...prev, plate: value }))}
                        showError={showErrors}
                      />
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginTop: 32,
                    paddingTop: 24,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    style={{
                      border: '1px solid var(--border)',
                      background: 'none',
                      padding: '13px 24px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      visibility: step === 1 ? 'hidden' : 'visible',
                    }}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={saving}
                    style={{
                      border: 'none',
                      background: stepBlocker || saving ? 'var(--border)' : 'var(--accent)',
                      color: stepBlocker || saving ? 'var(--muted)' : '#F5F2EE',
                      padding: '13px 28px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {step < 3 ? 'Continuar' : saving ? 'Confirmando…' : 'Confirmar turno'}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {confirmed && date && (
          <section
            className="slide-up"
            style={{ maxWidth: 640, margin: '0 auto', padding: '80px var(--gutter) 120px', textAlign: 'center' }}
          >
            <div style={{ ...EYEBROW, marginBottom: 20 }}>Turno solicitado</div>
            <h2 style={{ ...H2, margin: '0 0 24px' }}>
              Listo, {client.name}.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', margin: '0 0 24px' }}>
              Te escribimos para confirmarlo. Guardá estos datos:
            </p>
            <div
              style={{
                border: '1px solid var(--border)',
                padding: 24,
                textAlign: 'left',
                margin: '0 0 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 14 }}>
                <strong>Servicios:</strong> {selectedServices.join(', ')}
              </div>
              <div style={{ fontSize: 14 }}>
                <strong>Fecha:</strong> {longDate(new Date(`${date}T00:00:00`))}
              </div>
              <div style={{ fontSize: 14 }}>
                <strong>Entrega:</strong> {dropoff} · <strong>Retiro:</strong> {pickup}
              </div>
              <div style={{ fontSize: 14 }}>
                <strong>Patente:</strong> {client.plate}
              </div>
            </div>
            <Link
              href="/"
              className="ui-btn"
              style={{
                background: 'var(--invert-bg)',
                color: 'var(--invert-ink)',
                padding: '14px 28px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Volver al inicio
            </Link>
          </section>
        )}
      </main>

      <SiteFooter />
      <DarkToggle />
    </div>
  );
}

const STEP_TITLE: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 19,
  margin: '0 0 6px',
};

const STEP_HINT: CSSProperties = {
  fontSize: 13,
  color: 'var(--muted)',
  margin: '0 0 20px',
};

const GROUP_LABEL: CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 12,
};

const OPTION_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
  gap: 10,
};

const DAY_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))',
  gap: 8,
};

/** Casilla del selector de servicios: cuadrada si acepta varios, redonda si no. */
function Check({ active, round = false }: { active: boolean; round?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        flexShrink: 0,
        borderRadius: round ? '50%' : 2,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent)' : 'transparent',
        color: '#F5F2EE',
        fontSize: 11,
        lineHeight: '14px',
        textAlign: 'center',
        transition: 'background-color 0.18s ease, border-color 0.18s ease',
      }}
    >
      {active ? '✓' : ''}
    </span>
  );
}
