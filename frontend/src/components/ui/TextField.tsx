'use client';

import { useId, useState, type CSSProperties } from 'react';
import { FIELD, INPUT } from '@/lib/design';
import { fieldError, fieldRules, type FieldKind } from '@/lib/fields';

interface TextFieldProps {
  label?: string;
  value: string;
  /** Recibe el valor ya recortado por la regla del campo. */
  onChange: (value: string) => void;
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string;
  /** Fuerza el error a la vista aunque el campo no se haya tocado. */
  showError?: boolean;
  /** `site` usa el input grande del sitio; `panel`, el compacto del admin. */
  variant?: 'site' | 'panel';
  disabled?: boolean;
  style?: CSSProperties;
  id?: string;
}

const LABEL: CSSProperties = {
  display: 'block',
  fontSize: 12,
  letterSpacing: '0.04em',
  color: 'var(--muted)',
  marginBottom: 6,
};

/** Etiqueta del campo, con el asterisco de obligatorio. */
export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} style={LABEL}>
      {children}
      {required && <span style={{ color: 'var(--accent)' }}> *</span>}
    </label>
  );
}

/** Línea de ayuda debajo del campo: gris si es una pista, roja si es un error. */
export function FieldMessage({
  id,
  text,
  tone = 'hint',
}: {
  id?: string;
  text: string;
  tone?: 'hint' | 'error';
}) {
  return (
    <div
      id={id}
      style={{ fontSize: 12, marginTop: 5, color: tone === 'error' ? 'var(--danger)' : 'var(--muted)' }}
    >
      {text}
    </div>
  );
}

/**
 * Input controlado que aplica la regla de su `kind`: limita lo que se puede
 * tipear, valida al salir del campo y muestra el motivo del rechazo.
 */
export function TextField({
  label,
  value,
  onChange,
  kind = 'text',
  required = false,
  placeholder,
  showError = false,
  variant = 'site',
  disabled = false,
  style,
  id,
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [touched, setTouched] = useState(false);

  const rule = fieldRules[kind];
  const error = fieldError(kind, value, required);
  const visible = error && (touched || showError) ? error : null;
  const hintId = `${inputId}-hint`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      {label && (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      )}
      <input
        id={inputId}
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder ?? (label ? undefined : rule.hint)}
        type={rule.type ?? 'text'}
        inputMode={rule.inputMode}
        maxLength={rule.maxLength}
        autoComplete={rule.autoComplete}
        aria-label={label ? undefined : placeholder}
        aria-invalid={visible ? true : undefined}
        aria-describedby={visible || rule.hint ? hintId : undefined}
        onChange={(event) => onChange(rule.sanitize(event.target.value))}
        onBlur={() => setTouched(true)}
        style={{
          ...(variant === 'site' ? INPUT : FIELD),
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {(visible || rule.hint) && (
        <FieldMessage id={hintId} text={visible ?? rule.hint!} tone={visible ? 'error' : 'hint'} />
      )}
    </div>
  );
}

interface TextAreaFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  showError?: boolean;
  variant?: 'site' | 'panel';
  maxLength?: number;
  style?: CSSProperties;
}

/** Versión textarea del campo: mismo contrato de obligatoriedad y error. */
export function TextAreaField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  rows = 4,
  showError = false,
  variant = 'site',
  maxLength = 1200,
  style,
}: TextAreaFieldProps) {
  const inputId = useId();
  const [touched, setTouched] = useState(false);

  const error = required && !value.trim() ? 'Este campo es obligatorio.' : null;
  const visible = error && (touched || showError) ? error : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      {label && (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      )}
      <textarea
        id={inputId}
        rows={rows}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={label ? undefined : placeholder}
        aria-invalid={visible ? true : undefined}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        onBlur={() => setTouched(true)}
        style={{ ...(variant === 'site' ? INPUT : FIELD), resize: 'vertical' }}
      />
      {visible && <FieldMessage text={visible} tone="error" />}
    </div>
  );
}
