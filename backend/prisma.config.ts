import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin archivo: las variables vienen del entorno.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
