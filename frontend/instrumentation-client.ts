import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Se llama `instrumentation-client.ts` y no `sentry.client.config.ts` porque
 * Next carga este nombre de forma nativa. El otro lo inyecta el plugin de build
 * de Sentry (`withSentryConfig`), que este proyecto no usa: con ese nombre el
 * archivo quedaría sin bundlear y Sentry nunca arrancaría en el navegador, sin
 * ningún error que lo delate.
 */

// Sin DSN no se inicializa: en desarrollo no sale nada hacia afuera y nadie
// tiene que acordarse de apagarlo.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // Nada de session replay: grabaría el panel con datos de clientes reales.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
