'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DarkToggle } from '@/components/site/DarkToggle';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { AutocompleteField } from '@/components/ui/AutocompleteField';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/api';
import { CAR_BRANDS, modelsFor, versionsFor } from '@/lib/brands';
import { EYEBROW, H2, INPUT, PAGE_TITLE, SHELL } from '@/lib/design';
import { displayPhone, fieldsValid, focusFirstInvalid } from '@/lib/fields';
import { pluralize } from '@/lib/format';
import { useWizardStep } from '@/lib/hooks';

const STEP_LABELS = ['Datos', 'Vehículo', 'Estado', 'Fotos'];

interface FormData {
  name: string;
  phone: string;
  email: string;
  brand: string;
  model: string;
  version: string;
  year: string;
  mileage: string;
  plate: string;
  color: string;
  condition: string;
  service: string;
  accidents: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  phone: '',
  email: '',
  brand: '',
  model: '',
  version: '',
  year: '',
  mileage: '',
  plate: '',
  color: '',
  condition: '',
  service: '',
  accidents: '',
  notes: '',
};

/**
 * Foto elegida por el usuario. Vive sólo en el navegador: todavía no hay
 * storage, así que el archivo nunca se sube y la UI no debe insinuar que sí.
 */
interface SelectedImage {
  id: string;
  url: string;
}

/** Clave del borrador local del formulario de venta. */
const DRAFT_KEY = 'm5848_vender_draft';

const WIDTH = 900;

const STEP_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
  gap: 16,
};

const STEP_TITLE: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 20,
  margin: '0 0 6px',
};

const STEP_HINT: CSSProperties = { fontSize: 13, color: 'var(--muted)', margin: '0 0 24px' };

export function VenderMiAutoView() {
  const [step, setStep] = useWizardStep(4);
  const [data, setData] = useState<FormData>(EMPTY_FORM);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [restored, setRestored] = useState(false);
  const toast = useToast();

  // Son 14 campos repartidos en 4 pasos: perderlos por una recarga o una
  // llamada entrante es la diferencia entre un lead y nada.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) setData({ ...EMPTY_FORM, ...(JSON.parse(saved) as Partial<FormData>) });
    } catch {
      // Un borrador ilegible no debe romper el formulario.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // Sin storage disponible el formulario sigue funcionando, sin borrador.
    }
  }, [data, restored]);

  useEffect(() => {
    return () => {
      // Las URLs de objeto se liberan al desmontar para no filtrar memoria.
      setImages((current) => {
        current.forEach((image) => URL.revokeObjectURL(image.url));
        return current;
      });
    };
  }, []);

  const set = (key: keyof FormData) => (value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  // Las sugerencias se encadenan: la marca acota los modelos y el modelo, las
  // versiones. Los campos siguen aceptando texto libre.
  const modelSuggestions = useMemo(() => modelsFor(data.brand), [data.brand]);
  const versionSuggestions = useMemo(
    () => versionsFor(data.brand, data.model),
    [data.brand, data.model],
  );

  /** Cada paso tiene sus obligatorios; el botón no se habilita hasta cumplirlos. */
  const stepValid = (() => {
    switch (step) {
      case 1:
        return fieldsValid([
          { kind: 'name', value: data.name, required: true },
          { kind: 'phone', value: data.phone, required: true },
          { kind: 'email', value: data.email, required: true },
        ]);
      case 2:
        return fieldsValid([
          { kind: 'name', value: data.brand, required: true },
          { kind: 'text', value: data.model, required: true },
          { kind: 'year', value: data.year, required: true },
          { kind: 'plate', value: data.plate },
        ]);
      case 3:
        return data.condition !== '';
      default:
        return true;
    }
  })();

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const added: SelectedImage[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...added]);
    event.target.value = '';
  }

  async function goNext() {
    if (!stepValid) {
      setShowErrors(true);
      focusFirstInvalid();
      toast.error('Faltan datos', 'Completá los campos marcados para seguir.');
      return;
    }

    if (step < 4) {
      setShowErrors(false);
      setStep(step + 1);
      return;
    }

    setSending(true);
    try {
      await apiSend('/api/sell-requests', 'POST', {
        ...data,
        phone: displayPhone(data.phone),
        imageCount: images.length,
      });
      setSubmitted(true);
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nada que limpiar si el storage no está disponible.
      }
      toast.success('Solicitud enviada', 'Te contactamos en las próximas horas.');
    } catch (err) {
      toast.error(
        'No pudimos enviar la solicitud',
        err instanceof Error ? err.message : 'Probá de nuevo en unos minutos.',
      );
    } finally {
      setSending(false);
    }
  }

  const nextIncomplete = !stepValid;

  return (
    <div style={{ minHeight: '100vh' }}>
      <SiteHeader active="/vender-mi-auto" />

      <section style={{ ...SHELL, maxWidth: WIDTH, padding: '72px var(--gutter) 32px' }}>
        <div style={{ ...EYEBROW, marginBottom: 16 }}>Vender / consignar</div>
        <h1 style={{ ...PAGE_TITLE, margin: '0 0 14px' }}>
          ¿Querés vender tu auto?
        </h1>
        <p style={{ fontSize: 16, color: 'var(--muted)', margin: 0, maxWidth: 520 }}>
          Contanos sobre tu vehículo y nos ponemos en contacto con vos.
        </p>
      </section>

      {!submitted && (
        <>
          <section style={{ ...SHELL, maxWidth: WIDTH, padding: '0 var(--gutter) 8px' }}>
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

          <section style={{ ...SHELL, maxWidth: WIDTH, padding: '32px var(--gutter) 96px' }}>
            <div style={{ border: '1px solid var(--border)', padding: 'clamp(20px, 5vw, 48px)' }}>
              {step === 1 && (
                <div className="fadein">
                  <h2 style={STEP_TITLE}>Tus datos</h2>
                  <p style={STEP_HINT}>Los campos con * son obligatorios.</p>
                  <div style={STEP_GRID}>
                    <TextField
                      label="Nombre y apellido"
                      kind="name"
                      required
                      value={data.name}
                      onChange={set('name')}
                      showError={showErrors}
                    />
                    <TextField
                      label="Teléfono"
                      kind="phone"
                      required
                      value={data.phone}
                      onChange={set('phone')}
                      showError={showErrors}
                    />
                    <TextField
                      label="Email"
                      kind="email"
                      required
                      value={data.email}
                      onChange={set('email')}
                      showError={showErrors}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="fadein">
                  <h2 style={STEP_TITLE}>Tu vehículo</h2>
                  <p style={STEP_HINT}>Los campos con * son obligatorios.</p>
                  <div style={STEP_GRID}>
                    <AutocompleteField
                      label="Marca"
                      kind="name"
                      required
                      suggestions={CAR_BRANDS}
                      value={data.brand}
                      onChange={set('brand')}
                      showError={showErrors}
                    />
                    <AutocompleteField
                      label="Modelo"
                      required
                      suggestions={modelSuggestions}
                      value={data.model}
                      onChange={set('model')}
                      showError={showErrors}
                    />
                    <AutocompleteField
                      label="Versión"
                      suggestions={versionSuggestions}
                      value={data.version}
                      onChange={set('version')}
                    />
                    <TextField
                      label="Año"
                      kind="year"
                      required
                      value={data.year}
                      onChange={set('year')}
                      showError={showErrors}
                    />
                    <TextField
                      label="Kilometraje"
                      kind="integer"
                      value={data.mileage}
                      onChange={set('mileage')}
                    />
                    <TextField
                      label="Patente"
                      kind="plate"
                      value={data.plate}
                      onChange={set('plate')}
                      showError={showErrors}
                    />
                    <TextField label="Color" value={data.color} onChange={set('color')} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="fadein">
                  <h2 style={STEP_TITLE}>Estado del vehículo</h2>
                  <p style={STEP_HINT}>El estado general es obligatorio.</p>
                  <div style={{ ...STEP_GRID, marginBottom: 16 }}>
                    <LabeledSelect
                      label="Estado general"
                      required
                      value={data.condition}
                      onChange={set('condition')}
                      invalid={showErrors && !data.condition}
                      options={['Excelente', 'Muy bueno', 'Bueno', 'Regular']}
                    />
                    <LabeledSelect
                      label="Service al día"
                      value={data.service}
                      onChange={set('service')}
                      options={['Sí', 'No']}
                    />
                    <LabeledSelect
                      label="¿Tuvo accidentes?"
                      value={data.accidents}
                      onChange={set('accidents')}
                      options={['No', 'Sí, menor', 'Sí, importante']}
                    />
                  </div>
                  <TextAreaField
                    label="Observaciones"
                    rows={4}
                    value={data.notes}
                    onChange={set('notes')}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="fadein">
                  <h2 style={STEP_TITLE}>Fotos del vehículo</h2>
                  <p style={STEP_HINT}>Subí varias fotos: frente, laterales, interior y detalles.</p>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed var(--border)',
                      padding: '40px 20px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: 'var(--muted)',
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFiles}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em' }}>
                      Arrastrá imágenes acá o hacé clic para elegirlas
                    </span>
                  </label>
                  <div style={{ fontSize: 12, color: 'var(--muted)', margin: '14px 0' }}>
                    {images.length === 0
                      ? 'Las fotos son opcionales: podés mandarlas cuando te escribamos.'
                      : `${pluralize(images.length, 'foto elegida', 'fotos elegidas')} — te las vamos a pedir cuando te contactemos.`}
                  </div>

                  {images.length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: 10,
                      }}
                    >
                      {images.map((image) => (
                        <div key={image.id} style={{ position: 'relative', aspectRatio: '1' }}>
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              backgroundImage: `url(${image.url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundColor: 'var(--placeholder-a)',
                            }}
                          />
                          <button
                            type="button"
                            aria-label="Quitar"
                            onClick={() => {
                              URL.revokeObjectURL(image.url);
                              setImages((prev) => prev.filter((item) => item.id !== image.id));
                            }}
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              width: 22,
                              height: 22,
                              border: 'none',
                              background: 'rgba(16,15,13,0.75)',
                              color: '#F5F2EE',
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  onClick={() => {
                    setShowErrors(false);
                    setStep(step - 1);
                  }}
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
                  disabled={sending}
                  style={{
                    border: 'none',
                    background: nextIncomplete || sending ? 'var(--border)' : 'var(--accent)',
                    color: nextIncomplete || sending ? 'var(--muted)' : '#F5F2EE',
                    padding: '13px 28px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {step < 4 ? 'Continuar' : sending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {submitted && (
        <section
          className="slide-up"
          style={{ maxWidth: 640, margin: '0 auto', padding: '96px var(--gutter) 128px', textAlign: 'center' }}
        >
          <div style={{ ...EYEBROW, marginBottom: 20 }}>Recibido</div>
          <h2 style={{ ...H2, margin: '0 0 16px' }}>
            Recibimos tus datos.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', margin: '0 0 12px' }}>
            Vamos a revisar la información y te escribimos en las próximas horas al{' '}
            <strong style={{ color: 'var(--ink)' }}>{displayPhone(data.phone)}</strong>.
          </p>
          <p style={{ fontSize: 15, color: 'var(--muted)', margin: '0 0 32px' }}>
            Cuando te contactemos te pedimos las fotos del vehículo.
          </p>
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

      <SiteFooter />
      <DarkToggle />
    </div>
  );
}

interface LabeledSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  invalid?: boolean;
}

/** Select del sitio público con etiqueta y marca de obligatorio. */
function LabeledSelect({ label, value, onChange, options, required, invalid }: LabeledSelectProps) {
  const id = `sel-${label.toLowerCase().replace(/[^a-z]/g, '-')}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 6 }}
      >
        {label}
        {required && <span style={{ color: 'var(--accent)' }}> *</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid ? true : undefined}
        style={INPUT}
      >
        <option value="">Elegí una opción</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {invalid && (
        <div style={{ fontSize: 12, marginTop: 5, color: 'var(--danger)' }}>Este campo es obligatorio.</div>
      )}
    </div>
  );
}
