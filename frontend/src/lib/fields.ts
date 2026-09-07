import { normalizeText } from '@/lib/format';

/**
 * Reglas de entrada por tipo de campo.
 *
 * Cada regla hace tres cosas: recorta lo que se puede tipear (`sanitize`),
 * dice si lo tipeado sirve (`validate`) y aporta los atributos que el teclado
 * del celular necesita. Los formularios sólo eligen el `kind`.
 */

export type FieldKind =
  | 'text'
  | 'name'
  | 'email'
  | 'phone'
  | 'plate'
  | 'year'
  | 'integer'
  | 'money'
  | 'password';

export interface FieldRule {
  /** Recorta el valor tipeado al dominio del campo. */
  sanitize: (value: string) => string;
  /** Mensaje de error, o `null` si el valor sirve. Recibe sólo valores no vacíos. */
  validate: (value: string) => string | null;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal';
  maxLength?: number;
  autoComplete?: string;
  type?: string;
  /** Ayuda corta debajo del campo. */
  hint?: string;
}

const digits = (value: string) => value.replace(/\D/g, '');

/** Teléfono argentino sin 0 ni 15: código de área + número = 10 dígitos. */
export const PHONE_DIGITS = 10;

const MIN_YEAR = 1950;
const maxYear = () => new Date().getFullYear() + 1;

/** ABC123 (viejo) o AB123CD (Mercosur). */
const PLATE_OLD = /^[A-Z]{3}\d{3}$/;
const PLATE_MERCOSUR = /^[A-Z]{2}\d{3}[A-Z]{2}$/;

export const fieldRules: Record<FieldKind, FieldRule> = {
  text: {
    sanitize: (value) => value.slice(0, 120),
    validate: () => null,
    maxLength: 120,
  },
  name: {
    sanitize: (value) => value.replace(/[^\p{L}\p{M}\s'.-]/gu, '').slice(0, 60),
    validate: (value) => (value.trim().length < 2 ? 'Ingresá al menos 2 caracteres.' : null),
    maxLength: 60,
    autoComplete: 'name',
  },
  email: {
    sanitize: (value) => value.replace(/\s/g, '').slice(0, 120),
    validate: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : 'Revisá el email: falta @ o el dominio.',
    inputMode: 'email',
    type: 'email',
    maxLength: 120,
    autoComplete: 'email',
  },
  phone: {
    sanitize: (value) => digits(value).slice(0, PHONE_DIGITS),
    validate: (value) =>
      value.length === PHONE_DIGITS ? null : `El teléfono tiene ${PHONE_DIGITS} dígitos.`,
    inputMode: 'tel',
    type: 'tel',
    maxLength: PHONE_DIGITS,
    autoComplete: 'tel',
    hint: 'Código de área + número, sin 0 ni 15. Ej: 2235550111',
  },
  plate: {
    sanitize: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7),
    validate: (value) =>
      PLATE_OLD.test(value) || PLATE_MERCOSUR.test(value) ? null : 'Formato ABC123 o AB123CD.',
    maxLength: 7,
    hint: 'ABC123 o AB123CD',
  },
  year: {
    sanitize: (value) => digits(value).slice(0, 4),
    validate: (value) => {
      const year = Number(value);
      if (value.length < 4) return 'Ingresá el año completo (4 dígitos).';
      if (year < MIN_YEAR || year > maxYear()) return `El año va entre ${MIN_YEAR} y ${maxYear()}.`;
      return null;
    },
    inputMode: 'numeric',
    maxLength: 4,
  },
  integer: {
    sanitize: (value) => digits(value).slice(0, 9),
    validate: () => null,
    inputMode: 'numeric',
    maxLength: 9,
  },
  money: {
    sanitize: (value) => digits(value).slice(0, 12),
    validate: () => null,
    inputMode: 'numeric',
    maxLength: 12,
  },
  password: {
    sanitize: (value) => value.slice(0, 72),
    validate: (value) => (value.length < 8 ? 'Mínimo 8 caracteres.' : null),
    type: 'password',
    maxLength: 72,
    autoComplete: 'current-password',
  },
};

/**
 * Error de un campo, o `null` si está bien. Un campo vacío sólo falla cuando es
 * obligatorio; uno opcional con contenido igual se valida.
 */
export function fieldError(kind: FieldKind, value: string, required = false): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Este campo es obligatorio.' : null;
  return fieldRules[kind].validate(trimmed);
}

export interface FieldSpec {
  kind: FieldKind;
  value: string;
  required?: boolean;
}

/** `true` cuando todos los campos pasan. Es lo que habilita el botón de envío. */
export function fieldsValid(fields: FieldSpec[]): boolean {
  return fields.every((field) => fieldError(field.kind, field.value, field.required) === null);
}

/**
 * Ordena las coincidencias de un autocompletado: primero las que **empiezan**
 * con lo tipeado y después las que lo contienen en algún lado, así "to" ofrece
 * Toyota antes que Foton. Ignora mayúsculas y tildes.
 */
export function rankSuggestions(suggestions: string[], query: string, limit = 7): string[] {
  const term = normalizeText(query);
  if (!term) return suggestions.slice(0, limit);

  const starts: string[] = [];
  const contains: string[] = [];

  for (const option of suggestions) {
    const normalized = normalizeText(option);
    if (normalized.startsWith(term)) starts.push(option);
    else if (normalized.includes(term)) contains.push(option);
  }

  return [...starts, ...contains].slice(0, limit);
}

/** Muestra "2235550111" como "223 555-0111". */
export function displayPhone(value: string): string {
  const raw = digits(value);
  if (raw.length !== PHONE_DIGITS) return value;
  return `${raw.slice(0, 3)} ${raw.slice(3, 6)}-${raw.slice(6)}`;
}

/**
 * Enfoca y centra el primer campo inválido dentro de `root` (o del documento).
 *
 * Se llama justo después de `setShowErrors(true)`: el salto de frame le da a
 * React tiempo de pintar `aria-invalid`, que es lo que se busca acá. Sin esto,
 * un formulario largo marca el error fuera de pantalla y el usuario no ve nada.
 */
export function focusFirstInvalid(root?: HTMLElement | null): void {
  if (typeof window === 'undefined') return;

  window.requestAnimationFrame(() => {
    const scope: ParentNode = root ?? document;
    const target = scope.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!target) return;

    target.focus({ preventScroll: true });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  });
}
