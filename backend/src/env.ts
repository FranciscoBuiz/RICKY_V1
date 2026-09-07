import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  OAUTH_REDIRECT_URI: z.url(),

  SESSION_COOKIE_SECRET: z.string().min(32, 'debe tener al menos 32 caracteres'),
  BOOTSTRAP_ADMIN_EMAIL: z.string().min(3).optional(),

  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

export type Env = z.infer<typeof schema>;

/**
 * Valida la configuración. Se llama al arrancar: si falta un secreto, el proceso
 * muere ahí y no en el primer login de un usuario real.
 */
export function loadEnv(source: NodeJS.ProcessEnv | Record<string, unknown> = process.env): Env {
  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(source)) {
    if (valor !== undefined && valor !== '') limpio[clave] = valor;
  }

  const resultado = schema.safeParse(limpio);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración inválida:\n${detalle}`);
  }
  return resultado.data;
}
