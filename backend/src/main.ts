import './load-env.js';
import { buildApp } from './app.js';
import { loadEnv } from './env.js';
import { initSentry } from './observability/sentry.js';

const env = loadEnv();

// Antes de construir la app: si no, los errores de arranque no se reportan.
const sentryActivo = initSentry(env);

const app = await buildApp({ env });

await app.listen({ port: env.PORT, host: '0.0.0.0' });
app.log.info(`Sentry ${sentryActivo ? 'activo' : 'desactivado (sin DSN)'}`);

for (const señal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(señal, () => {
    void app.close().then(() => process.exit(0));
  });
}
