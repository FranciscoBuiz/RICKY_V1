'use client';

import Link from 'next/link';
import { useCallback, useState, type CSSProperties, type FormEvent } from 'react';
import { DarkToggle } from '@/components/site/DarkToggle';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/api';
import {
  EYEBROW,
  H2,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  PAGE_TITLE,
  PLACEHOLDER_LABEL,
  SHELL,
  vehicleStatusMeta,
  whatsappHref,
} from '@/lib/design';
import { displayPhone, fieldsValid, focusFirstInvalid } from '@/lib/fields';
import { kilometers, money } from '@/lib/format';
import { useIsNarrow, useKeydown } from '@/lib/hooks';
import type { PublicVehicle, VehicleImage } from '@/types';

/** Bandas de la galería: cada foto tiene su propio patrón para distinguirlas. */
function galleryStripe(index: number): string {
  const tints = [
    'var(--placeholder-a)',
    'var(--placeholder-b)',
    'var(--placeholder-c)',
    'var(--placeholder-d)',
    'var(--placeholder-a)',
  ];
  const angle = index % 2 === 0 ? 135 : 45;
  return `repeating-linear-gradient(${angle}deg, ${tints[index]} 0 20px, var(--placeholder-d) 20px 40px)`;
}

const NAV_BUTTON: CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(245,242,238,0.85)',
  color: '#171512',
  fontSize: 18,
  cursor: 'pointer',
};

const EMPTY_LEAD = { name: '', phone: '', email: '', message: '' };

export function VehiculoDetalleView({ vehicle }: { vehicle: PublicVehicle }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [lead, setLead] = useState(EMPTY_LEAD);
  const [showErrors, setShowErrors] = useState(false);
  const isMobile = useIsNarrow(860);
  const toast = useToast();

  /* Antes eran 5 fijas porque todas las fotos eran marcadores. Ahora cada
     vehículo trae las suyas: el Etios 2017 tiene 10 y la PCX 5. */
  const fotos = vehicle.images;
  const photoCount = Math.max(fotos.length, 1);
  // Slots de la tira de miniaturas: las fotos reales, o `photoCount` huecos
  // vacíos para el marcador cuando el vehículo todavía no tiene ninguna.
  const thumbnailSlots: (VehicleImage | undefined)[] =
    fotos.length > 0 ? fotos : Array.from({ length: photoCount });

  const title = `${vehicle.brand} ${vehicle.model} ${vehicle.version}`;
  const shortTitle = `${vehicle.brand} ${vehicle.model}`;
  const statusMeta = vehicleStatusMeta[vehicle.status];
  const waMessage = `Hola, quiero consultar por el ${shortTitle} ${vehicle.year}.`;
  // `null` mientras no haya número confirmado; el CTA cae a Instagram, que sí lo está.
  const waHref = whatsappHref(waMessage);

  const prev = useCallback(
    () => setActiveIndex((i) => (i + photoCount - 1) % photoCount),
    [photoCount],
  );
  const next = useCallback(() => setActiveIndex((i) => (i + 1) % photoCount), [photoCount]);

  useKeydown(
    useCallback(
      (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') prev();
        if (event.key === 'ArrowRight') next();
        if (event.key === 'Escape') setLightboxOpen(false);
      },
      [prev, next],
    ),
    lightboxOpen,
  );

  /* Mismo criterio que el catálogo anterior: las specs se arman de los campos
     reales y se saltea el que nadie cargó. Una fila "Motor: —" es ruido. */
  const specs = [
    { label: 'Marca', value: vehicle.brand },
    { label: 'Modelo', value: vehicle.model },
    { label: 'Versión', value: vehicle.version },
    { label: 'Año', value: String(vehicle.year) },
    { label: 'Kilometraje', value: kilometers(vehicle.mileage) },
    vehicle.engine ? { label: 'Motor', value: vehicle.engine } : null,
    { label: 'Combustible', value: vehicle.fuel },
    { label: 'Transmisión', value: vehicle.transmission },
    vehicle.traction ? { label: 'Tracción', value: vehicle.traction } : null,
    { label: 'Carrocería', value: vehicle.bodyType },
    { label: 'Color', value: vehicle.color },
    vehicle.doors ? { label: 'Puertas', value: String(vehicle.doors) } : null,
    { label: 'Ubicación', value: vehicle.location },
  ].filter((spec): spec is { label: string; value: string } => spec !== null);

  const setLeadField = (key: keyof typeof EMPTY_LEAD) => (value: string) =>
    setLead((prev) => ({ ...prev, [key]: value }));

  // El botón de envío arranca gris hasta que los tres obligatorios son válidos.
  const leadComplete = fieldsValid([
    { kind: 'name', value: lead.name, required: true },
    { kind: 'phone', value: lead.phone, required: true },
    { kind: 'email', value: lead.email, required: true },
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadComplete) {
      setShowErrors(true);
      focusFirstInvalid(event.currentTarget);
      toast.error('Faltan datos', 'Completá nombre, teléfono y email para enviar la consulta.');
      return;
    }

    setSending(true);
    try {
      await apiSend('/api/leads', 'POST', {
        name: lead.name.trim(),
        phone: displayPhone(lead.phone),
        email: lead.email.trim(),
        vehicle: title,
        origin: 'Web',
        message: lead.message.trim(),
      });
      setSubmitted(true);
      toast.success('Consulta enviada', 'Nos comunicamos a la brevedad.');
    } catch (error) {
      toast.error(
        'No pudimos enviar la consulta',
        error instanceof Error ? error.message : 'Probá de nuevo en unos minutos.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: isMobile ? 76 : 0 }}>
      <SiteHeader active="/catalogo" />

      <div
        style={{
          ...SHELL,
          padding: '20px var(--gutter) 0',
          fontSize: 13,
          color: 'var(--muted)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link href="/" style={{ color: 'var(--muted)' }}>
          Inicio
        </Link>
        <span>/</span>
        <Link href="/catalogo" style={{ color: 'var(--muted)' }}>
          Vehículos
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--ink)' }}>{shortTitle}</span>
      </div>

      {/* GALERÍA + FICHA */}
      <section
        style={{
          ...SHELL,
          padding: '20px var(--gutter) 0',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.4fr) minmax(280px,1fr)',
          gap: 40,
          alignItems: 'start',
        }}
      >
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setLightboxOpen(true)}
            onKeyDown={(event) => event.key === 'Enter' && setLightboxOpen(true)}
            style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden', cursor: 'zoom-in' }}
          >
            {fotos.length > 0 ? (
              <img
                src={fotos[activeIndex].src}
                alt={fotos[activeIndex].alt}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: galleryStripe(activeIndex),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={PLACEHOLDER_LABEL}>
                  [ foto {activeIndex + 1} de {photoCount} — {vehicle.model} {vehicle.version} ]
                </span>
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                background: statusMeta.badge,
                color: '#F5F2EE',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '5px 10px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {statusMeta.label}
            </div>
            <button
              type="button"
              aria-label="Anterior"
              onClick={(event) => {
                event.stopPropagation();
                prev();
              }}
              style={{ ...NAV_BUTTON, left: 10 }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={(event) => {
                event.stopPropagation();
                next();
              }}
              style={{ ...NAV_BUTTON, right: 10 }}
            >
              ›
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {thumbnailSlots.map((foto, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                style={{
                  flex: 1,
                  position: 'relative',
                  aspectRatio: '1',
                  overflow: 'hidden',
                  border: index === activeIndex ? '2px solid var(--accent)' : '1px solid var(--border)',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {foto && typeof foto === 'object' && 'src' in foto ? (
                  <img
                    src={foto.src}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: galleryStripe(index),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--placeholder-ink)' }}
                    >
                      {index + 1}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={isMobile ? undefined : { position: 'sticky', top: 96 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {vehicle.year} · {kilometers(vehicle.mileage)} · {vehicle.transmission} · {vehicle.fuel}
          </div>
          <h1 style={{ ...PAGE_TITLE, margin: '0 0 18px' }}>
            {shortTitle} {vehicle.version.split(' ')[0]}
          </h1>
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 28,
            }}
          >
            {money(vehicle.price)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <a
              href="#consulta"
              className="ui-btn"
              style={{
                background: 'var(--accent)',
                color: '#F5F2EE',
                textAlign: 'center',
                padding: 16,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Consultar por este vehículo
            </a>
            <a
              href="#consulta"
              className="ui-btn"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                textAlign: 'center',
                padding: 16,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Quiero verlo
            </a>
            <a
              href={whatsappHref(waMessage) ?? INSTAGRAM_URL}
              target={waHref ? undefined : '_blank'}
              rel={waHref ? undefined : 'noreferrer'}
              className="ui-link"
              style={{
                textAlign: 'center',
                padding: 14,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              {waHref ? 'WhatsApp →' : `Escribinos por Instagram ${INSTAGRAM_HANDLE} →`}
            </a>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 20,
              fontSize: 13,
              color: 'var(--muted)',
              lineHeight: 1.7,
            }}
          >
            Publicado por 5848 Motors · Gaboto 5848, Mar del Plata
          </div>
        </div>
      </section>

      {/* FICHA TÉCNICA */}
      <section style={{ ...SHELL, padding: '80px var(--gutter) 0' }}>
        <div style={EYEBROW}>Información técnica</div>
        <h2 style={{ ...H2, margin: '0 0 32px' }}>
          Ficha del vehículo
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            borderTop: '1px solid var(--border)',
          }}
        >
          {specs.map((spec) => (
            <div
              key={spec.label}
              style={{
                borderBottom: '1px solid var(--border)',
                borderInlineEnd: '1px solid var(--border)',
                padding: '18px 20px',
                marginInlineEnd: -1,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 6,
                }}
              >
                {spec.label}
              </div>
              {/* La Regla del Dato en Mono: la ficha es el dato, no la frase. */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600 }}>
                {spec.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DESCRIPCIÓN: ningún vehículo real la trae todavía, así que la sección
          entera se omite en vez de mostrar el título con un párrafo vacío. */}
      {vehicle.description ? (
        <section style={{ ...SHELL, padding: '56px var(--gutter) 0' }}>
          <div style={{ maxWidth: 720 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '0 0 16px' }}>
              Descripción
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-strong)' }}>{vehicle.description}</p>
          </div>
        </section>
      ) : null}

      {/* CONSULTA */}
      <section id="consulta" style={{ ...SHELL, padding: '80px var(--gutter) 96px' }}>
        <div
          style={{
            border: '1px solid var(--border)',
            padding: 'clamp(20px, 5vw, 56px)',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px,0.8fr) minmax(280px,1.2fr)',
            gap: 40,
          }}
        >
          <div>
            <div style={EYEBROW}>Consulta</div>
            <h2 style={{ ...H2, margin: '0 0 16px' }}>
              ¿Te interesa este vehículo?
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                border: '1px solid var(--border)',
                padding: 12,
                maxWidth: 320,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 42,
                  backgroundImage:
                    'repeating-linear-gradient(135deg, var(--placeholder-a) 0 8px, var(--border) 8px 16px)',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{shortTitle}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {vehicle.year} · {money(vehicle.price)}
                </div>
              </div>
            </div>
          </div>

          {submitted ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
                Consulta enviada
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                Nos vamos a poner en contacto a la brevedad.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <TextField
                label="Nombre"
                kind="name"
                required
                value={lead.name}
                onChange={setLeadField('name')}
                showError={showErrors}
              />
              <TextField
                label="Teléfono"
                kind="phone"
                required
                value={lead.phone}
                onChange={setLeadField('phone')}
                showError={showErrors}
              />
              <TextField
                label="Email"
                kind="email"
                required
                value={lead.email}
                onChange={setLeadField('email')}
                showError={showErrors}
              />
              <TextAreaField
                label="Mensaje"
                rows={3}
                value={lead.message}
                onChange={setLeadField('message')}
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                <input type="checkbox" name="similar" style={{ marginTop: 2 }} />
                Quiero recibir información sobre vehículos similares.
              </label>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                {/*
                  Habilitado aunque falten datos: el click marca los campos y
                  enfoca el primero, en lugar de dejar un rectángulo gris mudo.
                */}
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    background: leadComplete && !sending ? 'var(--accent)' : 'var(--border)',
                    color: leadComplete && !sending ? '#F5F2EE' : 'var(--muted)',
                    border: 'none',
                    padding: 15,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sending ? 'Enviando…' : 'Enviar consulta'}
                </button>
                <a
                  href={waHref ?? INSTAGRAM_URL}
                  target={waHref ? undefined : '_blank'}
                  rel={waHref ? undefined : 'noreferrer'}
                  className="ui-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '15px 20px',
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {waHref ? 'WhatsApp' : 'Instagram'}
                </a>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16,15,13,0.96)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              background: 'none',
              border: 'none',
              color: '#F5F2EE',
              fontSize: 28,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
          <div
            style={{
              width: 'min(90vw, 1000px)',
              aspectRatio: '4 / 3',
              backgroundImage: 'repeating-linear-gradient(135deg, #2A2620 0 22px, #201D19 22px 44px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#8f8a83' }}>
              [ foto {activeIndex + 1} de {photoCount} ]
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
            <button
              type="button"
              onClick={prev}
              style={{
                background: 'none',
                border: '1px solid rgba(245,242,238,0.3)',
                color: '#F5F2EE',
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              ‹ Anterior
            </button>
            <button
              type="button"
              onClick={next}
              style={{
                background: 'none',
                border: '1px solid rgba(245,242,238,0.3)',
                color: '#F5F2EE',
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}

      <SiteFooter />

      {/* CTA STICKY EN MOBILE */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            background: 'var(--header-bg)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid var(--border)',
            padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
            display: 'flex',
            gap: 10,
          }}
        >
          <a
            href="#consulta"
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'var(--accent)',
              color: '#F5F2EE',
              padding: 14,
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Consultar
          </a>
          <a
            href={waHref ?? INSTAGRAM_URL}
            target={waHref ? undefined : '_blank'}
            rel={waHref ? undefined : 'noreferrer'}
            aria-label={waHref ? 'Consultar por WhatsApp' : 'Escribirnos por Instagram'}
            style={{
              width: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {waHref ? 'WA' : 'IG'}
          </a>
        </div>
      )}

      <DarkToggle offset={isMobile ? 74 : 0} />
    </div>
  );
}
