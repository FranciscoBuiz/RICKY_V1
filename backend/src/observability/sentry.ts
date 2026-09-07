import * as Sentry from '@sentry/node';
import type { Env } from '../env.js';

/** Forma mínima de un evento; evita atarse a los tipos internos de Sentry. */
export interface SentryEvent {
  request?: {
    url?: string;
    /**
     * Sentry lo puebla solo, con la query **cruda y sin filtrar**, desde sus
     * integraciones por defecto (`httpIntegration` + `requestDataIntegration`).
     * Es el campo que en produccion lleva el `code` de OAuth.
     */
    query_string?: string | Record<string, string> | Array<[string, string]>;
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
const HEADERS_SENSIBLES = new Set(['cookie', 'set-cookie', 'authorization']);
const DEPURADO = '[depurado]';

/**
 * Corre sobre todo evento antes de salir del proceso. Un servicio de auth es el
 * peor lugar para mandarle payloads crudos a un tercero, y la configuración por
 * defecto de Sentry no alcanza.
 */
export function scrubEvent(event: SentryEvent): SentryEvent {
  if (event.request) {
    const { request } = event;

    // La URL se parsea **una sola vez** y el resultado se reusa para depurar los
    // parametros y para decidir si el path es de /auth. Parsearla dos veces fue un
    // bug real: la segunda llamada explotaba justo con las URLs que la primera no
    // habia podido arreglar.
    let parsed: URL | null = null;
    if (request.url !== undefined) {
      try {
        parsed = new URL(request.url);
      } catch {
        parsed = null;
      }

      if (parsed) {
        for (const param of PARAMS_SENSIBLES) {
          if (parsed.searchParams.has(param)) parsed.searchParams.set(param, DEPURADO);
        }
        request.url = parsed.toString();
      } else {
        // Se falla **cerrado**: si no se puede leer la URL, tampoco se puede saber
        // que lleva adentro, asi que no sale. Devolverla cruda seria justo lo
        // contrario de lo que este modulo existe para hacer.
        request.url = DEPURADO;
      }
    }

    // Sentry escribe este campo por su cuenta con la query cruda. `request.url`
    // ya lleva la misma informacion depurada, asi que borrarlo entero no pierde
    // nada util y cierra la unica via por la que el `code` seguia saliendo.
    delete request.query_string;

    delete request.cookies;

    if (request.headers) {
      // Comparacion en minusculas: Node ya normaliza los headers entrantes, pero
      // `scrubEvent` es una funcion exportada y no puede depender de eso.
      for (const clave of Object.keys(request.headers)) {
        if (HEADERS_SENSIBLES.has(clave.toLowerCase())) delete request.headers[clave];
      }
    }

    // El cuerpo de /auth/* puede traer tokens; ninguno vale lo que arriesga. Si la
    // URL no parseo, tampoco se sabe el path: se borra igual.
    if (!parsed || parsed.pathname.startsWith('/auth')) {
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
