const LOCALE = 'es-AR';

/**
 * Los seis vehículos están publicados en dólares y sus precios ya circularon
 * así por WhatsApp. Convertir a pesos exigiría una cotización inventada que
 * envejece en semanas.
 */
export function money(value: number): string {
  return `US$ ${value.toLocaleString(LOCALE)}`;
}

export function kilometers(value: number): string {
  return `${value.toLocaleString(LOCALE)} km`;
}

/** Kilometraje abreviado para tablas del panel: 45.000 → "45k km". */
export function kilometersShort(value: number): string {
  return `${(value / 1000).toFixed(0)}k km`;
}

export function longDate(date: Date): string {
  return date.toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "03/09" — formato corto usado en las tablas del panel. */
export function shortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function weekdayShort(date: Date): string {
  return weekdays[date.getDay()];
}

export function timeAgo(minutes: number): string {
  if (minutes < 5) return 'Nueva';
  if (minutes < 60) return `Hace ${minutes} min`;
  return `Hace ${Math.round(minutes / 60)} h`;
}

/**
 * Minúsculas, sin tildes y sin espacios de más. Es lo que usan las búsquedas y
 * los autocompletados para que "citroen" encuentre a "Citroën".
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Convierte texto de formulario a número, tolerando puntos y comas. */
export function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
