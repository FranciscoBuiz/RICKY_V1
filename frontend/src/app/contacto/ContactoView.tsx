'use client';

import { useState } from 'react';
import { AGENCY_ADDRESS, AgencyMap, MAP_LINK } from '@/components/site/AgencyMap';
import { DarkToggle } from '@/components/site/DarkToggle';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/api';
import {
  EYEBROW,
  HAS_WHATSAPP,
  INPUT,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  PAGE_TITLE,
  SHELL,
  WHATSAPP_NUMBER,
  whatsappHref,
} from '@/lib/design';
import { displayPhone, fieldsValid, focusFirstInvalid } from '@/lib/fields';
import { useIsNarrow } from '@/lib/hooks';

const DETAIL_LABEL: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 6,
};

const REASONS = ['Comprar un vehículo', 'Vender mi auto', 'Detailing', 'Otro'];

const EMPTY = { name: '', phone: '', email: '', reason: '', message: '' };

export function ContactoView() {
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const isMobile = useIsNarrow(860);
  const toast = useToast();

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // El botón arranca gris y sólo se activa cuando todos los obligatorios pasan.
  const complete =
    fieldsValid([
      { kind: 'name', value: form.name, required: true },
      { kind: 'phone', value: form.phone, required: true },
      { kind: 'email', value: form.email, required: true },
    ]) && form.message.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete) {
      setShowErrors(true);
      focusFirstInvalid(event.currentTarget);
      toast.error('Faltan datos', 'Completá los campos marcados para poder enviar.');
      return;
    }

    setSending(true);
    try {
      await apiSend('/api/leads', 'POST', {
        name: form.name.trim(),
        phone: displayPhone(form.phone),
        email: form.email.trim(),
        vehicle: form.reason || '—',
        origin: 'Web',
        message: form.message.trim(),
      });
      setSubmitted(true);
      toast.success('Mensaje enviado', 'Te vamos a responder a la brevedad.');
    } catch (err) {
      toast.error(
        'No pudimos enviar el mensaje',
        err instanceof Error ? err.message : 'Probá de nuevo en unos minutos.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <SiteHeader active="/contacto" />

      <section style={{ ...SHELL, padding: '72px var(--gutter) 24px' }}>
        <div style={{ ...EYEBROW, marginBottom: 14 }}>Contacto</div>
        <h1 style={PAGE_TITLE}>
          Hablemos.
        </h1>
      </section>

      <section
        style={{
          ...SHELL,
          padding: '24px var(--gutter) 96px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 1fr) minmax(320px, 1.2fr)',
          gap: 'clamp(32px, 5vw, 56px)',
          alignItems: 'start',
        }}
      >
        <div>
          <AgencyMap height={isMobile ? 260 : 320} style={{ marginBottom: 32 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <div style={DETAIL_LABEL}>Dirección</div>
              <a
                href={MAP_LINK}
                target="_blank"
                rel="noreferrer"
                className="ui-link"
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}
              >
                {AGENCY_ADDRESS}
              </a>
            </div>
            {HAS_WHATSAPP && (
              <div>
                <div style={DETAIL_LABEL}>WhatsApp</div>
                <a
                  href={whatsappHref() ?? undefined}
                  className="ui-link"
                  style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}
                >
                  {displayPhone(WHATSAPP_NUMBER)} →
                </a>
              </div>
            )}
            <div>
              <div style={DETAIL_LABEL}>Instagram</div>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="ui-link"
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}
              >
                {INSTAGRAM_HANDLE} →
              </a>
            </div>
            <div>
              <div style={DETAIL_LABEL}>Email</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>contacto@5848motors.com.ar</div>
            </div>
            <div>
              <div style={DETAIL_LABEL}>Horarios</div>
              <div style={{ fontSize: 15, color: 'var(--ink-strong)' }}>
                Escribinos por Instagram y te confirmamos si estamos abiertos.
              </div>
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', padding: 'clamp(20px, 4vw, 40px)' }}>
          {submitted ? (
            <div
              style={{
                minHeight: 260,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>
                Mensaje enviado
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                Te vamos a responder a la brevedad.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                  gap: 16,
                }}
              >
                <TextField
                  label="Nombre"
                  kind="name"
                  required
                  value={form.name}
                  onChange={set('name')}
                  showError={showErrors}
                />
                <TextField
                  label="Teléfono"
                  kind="phone"
                  required
                  value={form.phone}
                  onChange={set('phone')}
                  showError={showErrors}
                />
              </div>
              <TextField
                label="Email"
                kind="email"
                required
                value={form.email}
                onChange={set('email')}
                showError={showErrors}
              />
              <select
                value={form.reason}
                onChange={(event) => set('reason')(event.target.value)}
                style={INPUT}
                aria-label="Motivo de tu consulta"
              >
                <option value="">Motivo de tu consulta</option>
                {REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              <TextAreaField
                label="Mensaje"
                required
                rows={4}
                value={form.message}
                onChange={set('message')}
                showError={showErrors}
              />

              {/*
                Queda habilitado aunque falten datos: al hacer click marca los
                campos y enfoca el primero. Deshabilitarlo dejaba al usuario sin
                forma de saber qué faltaba.
              */}
              <button
                type="submit"
                disabled={sending}
                style={{
                  background: complete && !sending ? 'var(--accent)' : 'var(--border)',
                  color: complete && !sending ? '#F5F2EE' : 'var(--muted)',
                  border: 'none',
                  padding: 15,
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 4,
                  cursor: sending ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Enviando…' : 'Enviar mensaje'}
              </button>
              <a
                href={whatsappHref() ?? INSTAGRAM_URL}
                target={HAS_WHATSAPP ? undefined : '_blank'}
                rel={HAS_WHATSAPP ? undefined : 'noreferrer'}
                className="ui-btn"
                style={{
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                  padding: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {HAS_WHATSAPP ? 'Escribinos por WhatsApp' : 'Escribinos por Instagram'}
              </a>
            </form>
          )}
        </div>
      </section>

      <SiteFooter />
      <DarkToggle />
    </div>
  );
}
