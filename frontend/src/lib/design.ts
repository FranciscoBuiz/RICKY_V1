import type { CSSProperties } from 'react';
import type { AppointmentStatus, LeadStatus, VehicleStatus } from '@/types';

export const SHELL: CSSProperties = {
  maxWidth: 'var(--shell)',
  margin: '0 auto',
  padding: '0 var(--gutter)',
  width: '100%',
};

export const EYEBROW: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '0.12em',
  color: 'var(--accent)',
  textTransform: 'uppercase',
  marginBottom: 12,
};

/**
 * H1 de una página interior. Un único valor para las cinco: antes cada página
 * inventaba su propio `clamp` (42, 44, 48, 56, 60px), lo que leía como cinco
 * niveles de jerarquía distintos sin que ninguno lo fuera. El hero de la home
 * queda aparte, en Display.
 */
export const PAGE_TITLE: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 'clamp(32px, 5.2vw, 60px)',
  lineHeight: 1.05,
  letterSpacing: '-0.01em',
  margin: 0,
};

/**
 * Apertura de sección y encabezado de bloque. Un único valor: antes había cinco
 * (30, 32, 34, 36, 38px) repartidos en doce lugares, y el 42px original lo usaba
 * una sola sección. Una página ajusta margen y ancho, nunca el tamaño.
 */
export const H2: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 'clamp(26px, 3vw, 36px)',
  margin: 0,
  letterSpacing: '-0.01em',
};

export const META_LINE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.1em',
  color: 'var(--muted)',
  textTransform: 'uppercase',
};

export const INPUT: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  padding: '13px 14px',
  fontSize: 14,
  color: 'var(--ink)',
  width: '100%',
};

export const TEXTAREA: CSSProperties = { ...INPUT, resize: 'vertical' };

export const FIELD: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--ink)',
  width: '100%',
};

export const PRIMARY_BUTTON: CSSProperties = {
  background: 'var(--accent)',
  color: '#F5F2EE',
  border: 'none',
  padding: 15,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

export const INVERT_BUTTON: CSSProperties = {
  background: 'var(--invert-bg)',
  color: 'var(--invert-ink)',
  border: 'none',
  padding: 14,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

export const GHOST_BUTTON: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'none',
  color: 'var(--ink)',
  padding: '13px 24px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

/**
 * Marcador de foto: bandas diagonales alternadas. Reemplaza al `<img>` hasta
 * que existan fotos reales del stock.
 */
export function photoPlaceholder(index: number, alt = false): CSSProperties {
  const angle = alt ? 45 : 135;
  const base = alt
    ? 'var(--placeholder-d)'
    : index % 2 === 0
      ? 'var(--placeholder-a)'
      : 'var(--placeholder-b)';
  const stripe = alt ? 'var(--placeholder-e)' : 'var(--placeholder-c)';
  return {
    position: 'absolute',
    inset: 0,
    background: `repeating-linear-gradient(${angle}deg, ${base} 0 18px, ${stripe} 18px 36px)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.4s ease',
  };
}

/** Variante estática para bloques decorativos (no van dentro de una tarjeta). */
export function photoPanel(angle = 135): CSSProperties {
  return {
    backgroundImage: `repeating-linear-gradient(${angle}deg, var(--placeholder-a) 0 20px, var(--border) 20px 40px)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export const PLACEHOLDER_LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  color: 'var(--placeholder-ink)',
};

export const vehicleStatusMeta: Record<VehicleStatus, { label: string; badge: string; tone: string }> = {
  available: { label: 'Disponible', badge: 'rgba(23,21,18,0.85)', tone: 'var(--ok)' },
  reserved: { label: 'Reservado', badge: 'rgba(226,97,10,0.9)', tone: 'var(--accent)' },
  sold: { label: 'Vendido', badge: 'rgba(107,101,96,0.9)', tone: 'var(--muted)' },
};

export function statusBadge(status: VehicleStatus): CSSProperties {
  return {
    position: 'absolute',
    top: 14,
    left: 14,
    background: vehicleStatusMeta[status].badge,
    color: '#F5F2EE',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '5px 10px',
    fontFamily: 'var(--font-mono)',
  };
}

interface Pill {
  label: string;
  color: string;
  bgLight: string;
  bgDark: string;
}

export const adminVehicleStatus: Record<VehicleStatus, Pill> = {
  available: { label: 'Disponible', color: '#2F7A4D', bgLight: '#EFF6F0', bgDark: 'rgba(47,122,77,0.25)' },
  reserved: { label: 'Reservado', color: '#E2610A', bgLight: '#FDF1E7', bgDark: 'rgba(226,97,10,0.25)' },
  sold: { label: 'Vendido', color: '#6B6560', bgLight: '#F0EEEA', bgDark: 'rgba(156,150,140,0.25)' },
};

export const appointmentStatusMeta: Record<AppointmentStatus, Pill> = {
  pending: { label: 'Pendiente', color: '#8A6D3B', bgLight: '#FDF6E3', bgDark: 'rgba(138,109,59,0.3)' },
  confirmed: { label: 'Confirmado', color: '#2F7A4D', bgLight: '#EFF6F0', bgDark: 'rgba(47,122,77,0.25)' },
  in_progress: { label: 'En proceso', color: '#3A5A9B', bgLight: '#EDF1FA', bgDark: 'rgba(58,90,155,0.25)' },
  completed: { label: 'Completado', color: '#6B6560', bgLight: '#F0EEEA', bgDark: 'rgba(156,150,140,0.25)' },
  cancelled: { label: 'Cancelado', color: '#E2610A', bgLight: '#FDF1E7', bgDark: 'rgba(226,97,10,0.25)' },
};

export const leadStatusMeta: Record<LeadStatus, Pill> = {
  new: { label: 'Nuevo', color: '#E2610A', bgLight: '#FDF1E7', bgDark: 'rgba(226,97,10,0.25)' },
  contacted: { label: 'Contactado', color: '#3A5A9B', bgLight: '#EDF1FA', bgDark: 'rgba(58,90,155,0.25)' },
  negotiating: { label: 'En negociación', color: '#8A6D3B', bgLight: '#FDF6E3', bgDark: 'rgba(138,109,59,0.3)' },
  closed: { label: 'Cerrado', color: '#2F7A4D', bgLight: '#EFF6F0', bgDark: 'rgba(47,122,77,0.25)' },
  discarded: { label: 'Descartado', color: '#6B6560', bgLight: '#F0EEEA', bgDark: 'rgba(156,150,140,0.25)' },
};

export function pillStyle(meta: Pill, dark: boolean): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    background: dark ? meta.bgDark : meta.bgLight,
    color: meta.color,
    whiteSpace: 'nowrap',
  };
}

/** Estado siguiente de un turno según la acción principal disponible. */
export const nextAppointmentAction: Partial<Record<AppointmentStatus, { label: string; next: AppointmentStatus }>> = {
  pending: { label: 'Confirmar', next: 'confirmed' },
  confirmed: { label: 'Iniciar servicio', next: 'in_progress' },
  in_progress: { label: 'Completar', next: 'completed' },
};

/**
 * Número de WhatsApp de la agencia, sólo dígitos. Vacío mientras no esté
 * confirmado: antes esto caía al literal `'WHATSAPP_NUMBER'` y todos los CTA
 * apuntaban a `wa.me/WHATSAPP_NUMBER`, que es una página de error.
 */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

/** Mientras sea `false`, ningún CTA de WhatsApp se renderiza. */
export const HAS_WHATSAPP = WHATSAPP_NUMBER.length > 0;

/** Instagram es el único canal de contacto confirmado de la agencia. */
export const INSTAGRAM_HANDLE = '@5848motors';
export const INSTAGRAM_URL = 'https://instagram.com/5848motors';

/**
 * Devuelve `null` cuando no hay número configurado, para que el tipo obligue a
 * cada llamador a resolver la ausencia en lugar de emitir un enlace roto.
 */
export function whatsappHref(message?: string): string | null {
  if (!HAS_WHATSAPP) return null;
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
