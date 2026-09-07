import * as Sentry from '@sentry/node';
import type { Env } from '../env.js';

/** Forma mínima de un evento; evita atarse a los tipos internos de Sentry. */
export interface SentryEvent {
  request?: {
    url?: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string | undefined>;
    data?: unknown;
  };
  user?: { id?: string; email?: string; username?: string; [k: string]: unknown };
  [k: string]: unknown;
}

/**
 * `code` es una credencial de un solo uso: en un stack trace del callback viaja
 * dentro de la URL del request, y quien lo lea antes de que expire puede
 * canjearlo por la identidad del usuario.
 */
const PARAMS_SENSIBLES = ['code', 'state', 'id_token', 'access_token', 'refresh_token'];
const HEADERS_SENSIBLES = ['cookie', 'set-cookie', 'authorization'];
const DEPURADO = '[depurado]';

function depurarUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const param of PARAMS_SENSIBLES) {
      if (parsed.searchParams.has(param)) parsed.searchParams.set(param, DEPURADO);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Corre sobre todo evento antes de salir del proceso. Un servicio de auth es el
 * peor lugar para mandarle payloads crudos a un tercero, y la configuración por
 * defecto de Sentry no alcanza.
 */
export function scrubEvent(event: SentryEvent): SentryEvent {
  if (event.request) {
    const { request } = event;

    if (request.url) request.url = depurarUrl(request.url);
    delete request.cookies;

    if (request.headers) {
      for (const header of HEADERS_SENSIBLES) delete request.headers[header];
    }

    // El cuerpo de /auth/* puede traer tokens; ninguno vale lo que arriesga.
    if (request.url && new URL(request.url).pathname.startsWith('/auth')) {
      delete request.data;
    }
  }

  if (event.user) {
    event.user = event.user.id === undefined ? {} : { id: event.user.id };
  }

  return event;
}

/** Devuelve `false` si no se inicializó. Sin DSN, nada sale del proceso. */
export function initSentry(env: Env): boolean {
  if (!env.SENTRY_DSN) return false;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event as unknown as SentryEvent) as unknown as typeof event,
  });

  return true;
}
