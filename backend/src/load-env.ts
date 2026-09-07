/**
 * Módulo de efecto: carga `.env` en `process.env` al importarse.
 *
 * Existe por un problema de orden. `db/prisma.ts` necesita `DATABASE_URL` en el
 * momento en que se evalúa, y los `import` de ESM se evalúan antes que cualquier
 * línea del módulo que los declara. Importar esto **primero** garantiza que el
 * `.env` ya esté cargado cuando se construya el cliente.
 */
try {
  process.loadEnvFile('.env');
} catch {
  // Sin archivo: las variables vienen del entorno (CI, contenedor).
}
