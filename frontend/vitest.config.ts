import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    /* El alias `@/` lo resuelve el compilador de Next, que no participa acá.
       Sin esto, cualquier import de `@/lib/...` falla en el runner. */
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
