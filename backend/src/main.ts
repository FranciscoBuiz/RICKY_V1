import './load-env.js';
import { buildApp } from './app.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const app = await buildApp({ env });

await app.listen({ port: env.PORT, host: '0.0.0.0' });

for (const señal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(señal, () => {
    void app.close().then(() => process.exit(0));
  });
}
