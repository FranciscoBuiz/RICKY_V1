# Backend de autenticación (OIDC con Google) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el servicio `backend/` que autentica al equipo de 5848 Motors con Google vía OIDC, emite sesiones propias revocables y protege la administración de usuarios del panel.

**Architecture:** Servicio Fastify independiente en `:4000` con Postgres en Docker, al que el navegador nunca llega directo: Next actúa de BFF y reenvía `/api/auth/*` y `/api/settings/users*`. La sesión es un token opaco en cookie `httpOnly`, cuyo SHA-256 vive en la base, lo que permite revocarla. Google se usa solo para identificar; no se guarda ninguno de sus tokens.

**Tech Stack:** Node 22 · TypeScript · Fastify 5 · Prisma 7 · PostgreSQL 17 (Docker) · openid-client 6 · zod 4 · Vitest · Sentry

**Spec:** `docs/superpowers/specs/2026-09-07-backend-auth-oidc-design.md`

## Global Constraints

- **Node 22.15.0** es el runtime instalado. No usar APIs de Node 23+.
- **Módulos ESM.** `"type": "module"` en `backend/package.json`, `module`/`moduleResolution` en `NodeNext`. **Todo import relativo lleva extensión `.js`**, incluso apuntando a un archivo `.ts`. Un import sin extensión falla en runtime.
- **Versiones exactas** (sin `^`) en `dependencies` y `devDependencies`, salvo `@types/node`:
  - `fastify@5.12.3` · `@fastify/cookie@11.1.2` · `openid-client@6.8.8` · `zod@4.5.4`
  - `@prisma/client@7.10.0` · `prisma@7.10.0` · `@prisma/adapter-pg@7.10.0` · `pg@8.23.0` · `@sentry/node@10.73.0`
  - `typescript@5.9.3` · `vitest@4.1.11` · `tsx@4.23.13` · `@types/node@^22.15.0`
  - Frontend: `@sentry/nextjs@10.73.0`
- **TypeScript 5.9.3 es deliberado**, no un descuido: la última es 7.0.2, pero es el compilador nativo nuevo y acá se combina con tipos generados por Prisma 7. El frontend ya está en 5.7.3. Subir a 7 es un cambio aparte y fácil, después de que esto funcione.
- **`@types/node` va en `^22.15.0`**, no en la última (26.x): tiene que coincidir con el Node que corre, no con el último publicado.
- **openid-client v6 tiene API funcional**, no la de clases de la v5. Verificado: `client.discovery(server, clientId, clientSecret)`, `client.randomPKCECodeVerifier()`, `client.calculatePKCECodeChallenge(v)`, `client.randomState()`, `client.randomNonce()`, `client.buildAuthorizationUrl(config, params)`, `client.authorizationCodeGrant(config, currentUrl, { pkceCodeVerifier, expectedState, expectedNonce })`, y `tokens.claims(): IDToken | undefined`.
- **Prisma 7 usa el generator `prisma-client`** (el viejo `prisma-client-js` está deprecado) y **`output` es obligatorio**. El cliente se importa desde la carpeta generada, no desde `@prisma/client`.
- **Prisma 7 exige un driver adapter.** `new PrismaClient()` a secas lanza
  `PrismaClientInitializationError: a driver adapter is required`: ya no hay motor
  Rust que abra la conexión. Va `@prisma/adapter-pg` sobre `pg`.
- **Prisma 7 rechaza `url` dentro del bloque `datasource`** (error P1012 en cualquier
  comando del CLI). La cadena de conexión vive en `backend/prisma.config.ts`.
- **Nada de `dotenv`.** Node 22 trae `process.loadEnvFile(path)`.
- **Todos los mensajes de error de la API van en español**, con la forma `{ "error": "..." }`, porque `frontend/src/lib/api.ts` los muestra tal cual.
- **Un commit por tarea**, al final, después de que los tests pasen.
- Trabajar siempre desde `backend/` salvo que la tarea diga otra cosa.

---

## Estructura de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `backend/docker-compose.yml` | Postgres 17 local, con volumen y healthcheck |
| `backend/docker/init-test-db.sql` | Crea `motors_test` al crear el volumen |
| `backend/src/env.ts` | Valida la configuración con zod. No sabe de HTTP ni de base. |
| `backend/src/app.ts` | Arma la instancia Fastify y monta las rutas. No escucha el puerto. |
| `backend/src/main.ts` | Carga `.env`, inicializa Sentry, escucha. Es el único con efectos de arranque. |
| `backend/src/http/errors.ts` | Forma `{ error }` y helper de respuesta |
| `backend/src/db/prisma.ts` | Cliente Prisma singleton |
| `backend/src/observability/sentry.ts` | `init` + depuración de datos sensibles. Función pura testeable. |
| `backend/src/auth/session.ts` | Crear / resolver / revocar sesión. **No sabe de HTTP.** |
| `backend/src/auth/guard.ts` | `preHandler` de Fastify. Traduce sesión a `request.user`. |
| `backend/src/auth/oidc.ts` | Envuelve openid-client detrás de una interfaz inyectable |
| `backend/src/auth/routes.ts` | `/auth/*`. Es el único que sabe de cookies de OAuth. |
| `backend/src/users/repo.ts` | Consultas de usuarios. No sabe de HTTP. |
| `backend/src/users/routes.ts` | `/users/*` + traducción de roles al contrato del frontend |
| `frontend/src/app/api/auth/[...path]/route.ts` | Proxy al backend |
| `frontend/src/middleware.ts` | Redirige `/admin` sin cookie a `/login` |

Cada módulo tiene una dependencia hacia adentro y ninguna hacia afuera: `session.ts` no importa nada de HTTP, `oidc.ts` no sabe que existen las sesiones, y `guard.ts` no sabe que existe Google. Por eso el flujo entero se puede testear con un doble del cliente OIDC y sin tocar la red.

---

## Task 1: Andamiaje, Docker y `/health`

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/.gitignore`, `backend/.env.example`, `backend/docker-compose.yml`, `backend/docker/init-test-db.sql`
- Create: `backend/src/env.ts`, `backend/src/app.ts`, `backend/src/main.ts`, `backend/src/http/errors.ts`
- Test: `backend/tests/setup.ts`, `backend/tests/env.test.ts`, `backend/tests/health.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Env` y `loadEnv(source?: NodeJS.ProcessEnv): Env` — lanza `Error` si falta o es inválida una variable.
  - `interface AppDeps { env: Env }` — las tareas siguientes le agregan campos.
  - `buildApp(deps: AppDeps): Promise<FastifyInstance>`
  - `sendError(reply, status: number, message: string)`

- [ ] **Step 1: Crear el proyecto y las dependencias**

```bash
cd backend
npm init -y
npm pkg set type=module name=motors-backend version=0.1.0 private=true
npm pkg delete main
npm install fastify@5.12.3 @fastify/cookie@11.1.2 openid-client@6.8.8 zod@4.5.4 @prisma/client@7.10.0 @sentry/node@10.73.0
npm install -D typescript@5.9.3 vitest@4.1.11 tsx@4.23.13 prisma@7.10.0 "@types/node@^22.15.0"
```

- [ ] **Step 2: Escribir `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "prisma/**/*.ts"]
}
```

- [ ] **Step 3: Escribir `backend/.gitignore`**

```
node_modules
src/generated
.env
.env.test
*.tsbuildinfo
```

`src/generated` es código que produce Prisma en cada `generate`. Versionarlo genera diffs enormes y conflictos de merge sin ningún valor.

- [ ] **Step 4: Escribir `backend/docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: motors-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - motors-db-data:/var/lib/postgresql/data
      - ./docker/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  motors-db-data:
```

El `$${POSTGRES_USER}` con doble `$` es intencional: escapa la interpolación de Compose para que la variable la resuelva el shell **adentro** del contenedor.

- [ ] **Step 5: Escribir `backend/docker/init-test-db.sql`**

```sql
CREATE DATABASE motors_test;
```

- [ ] **Step 6: Escribir `backend/.env.example`**

```
# Postgres (los lee docker-compose al crear el contenedor)
POSTGRES_USER=motors
POSTGRES_PASSWORD=motors_dev_password
POSTGRES_DB=motors
DB_PORT=5432

DATABASE_URL=postgresql://motors:motors_dev_password@localhost:5432/motors
DATABASE_URL_TEST=postgresql://motors:motors_dev_password@localhost:5432/motors_test

NODE_ENV=development
PORT=4000
APP_ORIGIN=http://localhost:3000

# Google Cloud Console > APIs y servicios > Credenciales > ID de cliente de OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Minimo 32 caracteres. Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_COOKIE_SECRET=

# Primer administrador; solo lo usa el seed
BOOTSTRAP_ADMIN_EMAIL=

# Vacio en desarrollo: sin DSN, Sentry no se inicializa
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
```

- [ ] **Step 7: Copiar el ejemplo a `.env` y `.env.test`**

```bash
cp .env.example .env
cp .env.example .env.test
node -e "const s=require('crypto').randomBytes(32).toString('hex');console.log('Pega este valor en SESSION_COOKIE_SECRET de .env y .env.test:');console.log(s)"
```

Editar `.env.test` para que `DATABASE_URL` apunte a la base de tests:

```
DATABASE_URL=postgresql://motors:motors_dev_password@localhost:5432/motors_test
NODE_ENV=test
```

- [ ] **Step 8: Escribir el test que falla, `backend/tests/env.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.js';

const completo = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/motors',
  APP_ORIGIN: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  SESSION_COOKIE_SECRET: 'x'.repeat(32),
};

describe('loadEnv', () => {
  it('acepta una configuración completa y aplica los valores por defecto', () => {
    const env = loadEnv(completo);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.SENTRY_TRACES_SAMPLE_RATE).toBe(0.1);
  });

  it('falla nombrando la variable que falta', () => {
    const { GOOGLE_CLIENT_SECRET, ...incompleto } = completo;
    expect(() => loadEnv(incompleto)).toThrow(/GOOGLE_CLIENT_SECRET/);
  });

  it('rechaza un SESSION_COOKIE_SECRET corto', () => {
    expect(() => loadEnv({ ...completo, SESSION_COOKIE_SECRET: 'corto' })).toThrow(
      /SESSION_COOKIE_SECRET/,
    );
  });

  it('rechaza un APP_ORIGIN que no es una URL', () => {
    expect(() => loadEnv({ ...completo, APP_ORIGIN: 'no-es-una-url' })).toThrow(/APP_ORIGIN/);
  });

  it('convierte PORT a número', () => {
    expect(loadEnv({ ...completo, PORT: '4100' }).PORT).toBe(4100);
  });
});
```

- [ ] **Step 9: Escribir `backend/vitest.config.ts` y `backend/tests/setup.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
  },
});
```

`fileParallelism: false` es obligatorio: todos los archivos de test comparten la misma base `motors_test` y se truncan tablas entre tests. En paralelo se pisarían entre ellos.

```ts
// tests/setup.ts
try {
  process.loadEnvFile('.env.test');
} catch {
  // En CI las variables vienen del entorno; que no exista el archivo no es un error.
}
```

- [ ] **Step 10: Correr el test y verificar que falla**

Run: `npm test -- env`
Expected: FAIL — `Failed to load ../src/env.js` (todavía no existe).

- [ ] **Step 11: Escribir `backend/src/env.ts`**

```ts
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
```

El filtrado de cadenas vacías importa: un `.env` con `SENTRY_DSN=` deja la variable definida como `''`, y sin esto zod la tomaría como un valor presente.

- [ ] **Step 12: Correr el test y verificar que pasa**

Run: `npm test -- env`
Expected: PASS, 5 tests.

- [ ] **Step 13: Escribir el test que falla, `backend/tests/health.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/env.js';

const env = loadEnv({
  // Sin esto, NODE_ENV cae en 'development' y Fastify escupe logs JSON de cada
  // request en la salida de los tests. La salida tiene que quedar limpia.
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/motors',
  APP_ORIGIN: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  SESSION_COOKIE_SECRET: 'x'.repeat(32),
});

describe('GET /health', () => {
  it('responde ok', async () => {
    const app = await buildApp({ env });
    const respuesta = await app.inject({ method: 'GET', url: '/health' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ ok: true });

    await app.close();
  });
});
```

- [ ] **Step 14: Correr el test y verificar que falla**

Run: `npm test -- health`
Expected: FAIL — no existe `../src/app.js`.

- [ ] **Step 15: Escribir `backend/src/http/errors.ts`**

```ts
import type { FastifyReply } from 'fastify';

/**
 * Forma `{ error }` en español. Es el contrato que ya consume
 * `frontend/src/lib/api.ts`, que muestra el mensaje tal cual al usuario.
 */
export function sendError(reply: FastifyReply, status: number, message: string): FastifyReply {
  return reply.status(status).send({ error: message });
}
```

- [ ] **Step 16: Escribir `backend/src/app.ts`**

```ts
import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Env } from './env.js';

export interface AppDeps {
  env: Env;
}

/**
 * Arma la app sin escuchar ningún puerto: así los tests la ejercitan con
 * `app.inject()` sin abrir sockets ni pelear por puertos ocupados.
 */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: deps.env.NODE_ENV !== 'test',
    trustProxy: true,
  });

  await app.register(cookie, { secret: deps.env.SESSION_COOKIE_SECRET });

  app.get('/health', async () => ({ ok: true }));

  return app;
}
```

- [ ] **Step 17: Escribir `backend/src/main.ts`**

```ts
import { buildApp } from './app.js';
import { loadEnv } from './env.js';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin archivo: las variables vienen del entorno.
}

const env = loadEnv();
const app = await buildApp({ env });

await app.listen({ port: env.PORT, host: '0.0.0.0' });

for (const señal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(señal, () => {
    void app.close().then(() => process.exit(0));
  });
}
```

- [ ] **Step 18: Agregar los scripts a `backend/package.json`**

```bash
npm pkg set scripts.dev="tsx watch src/main.ts"
npm pkg set scripts.start="tsx src/main.ts"
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.db:up="docker compose up -d --wait"
npm pkg set scripts.db:down="docker compose down"
npm pkg set scripts.db:logs="docker compose logs -f db"
```

`docker compose up -d --wait` no vuelve hasta que el healthcheck pasa. Sin `--wait`, el comando siguiente le pega a un Postgres que todavía arranca.

- [ ] **Step 19: Correr los tests y el typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, 6 tests, sin errores de tipos.

- [ ] **Step 20: Levantar la base y verificar que responde**

Run:
```bash
npm run db:up
docker exec motors-db psql -U motors -d motors_test -c "select 1"
```
Expected: el contenedor queda `healthy` y el `psql` devuelve una fila. Que `motors_test` exista confirma que corrió el script de `initdb`.

- [ ] **Step 21: Commit**

```bash
cd ..
git add backend .gitignore
git commit -m "feat(backend): andamiaje Fastify, Postgres en Docker y /health"
```

---

## Task 2: Prisma — esquema, migración y seed

**Files:**
- Create: `backend/prisma/schema.prisma`, `backend/prisma.config.ts`, `backend/prisma/seed.ts`, `backend/src/load-env.ts`, `backend/src/db/prisma.ts`, `backend/tests/db.ts`
- Test: `backend/tests/seed.test.ts`
- Modify: `backend/package.json` (scripts + deps del adapter), `backend/src/main.ts` (import de `load-env.js`)

**Interfaces:**
- Consumes: `loadEnv`, `Env` (Task 1).
- Produces:
  - `prisma` — instancia singleton de `PrismaClient`.
  - `type Role = 'ADMIN' | 'EDITOR' | 'VIEWER'` y `type UserStatus = 'PENDING' | 'ACTIVE'` desde `src/db/prisma.ts`.
  - `seedBootstrapAdmin(email: string): Promise<void>` desde `prisma/seed.ts`.
  - `limpiarBase(): Promise<void>` desde `tests/db.ts`, para usar en `beforeEach`.

- [ ] **Step 1: Escribir `backend/prisma/schema.prisma` y `backend/prisma.config.ts`**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}

enum UserStatus {
  PENDING
  ACTIVE
}

model User {
  id          String     @id @default(cuid())
  email       String     @unique
  name        String
  role        Role
  status      UserStatus @default(PENDING)
  googleSub   String?    @unique
  invitedAt   DateTime   @default(now())
  lastLoginAt DateTime?
  sessions    Session[]
}

model Session {
  id         String    @id @default(cuid())
  tokenHash  String    @unique
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  ttlMs      Int
  createdAt  DateTime  @default(now())
  lastSeenAt DateTime  @default(now())
  expiresAt  DateTime
  revokedAt  DateTime?
  userAgent  String?
  ip         String?

  @@index([userId])
}
```

**El bloque `datasource` no lleva `url`.** Prisma 7 lo rechaza con P1012 en cualquier
comando del CLI. La cadena de conexión va en `backend/prisma.config.ts`:

```ts
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
```

`ttlMs` y `lastSeenAt` no estaban en el spec y son necesarios para la renovación
deslizante que sí especifica: `ttlMs` recuerda cuánto dura esta sesión (12 h o 30 días
según "recordarme") y `lastSeenAt` es lo que permite renovar como mucho una vez por
hora. Sin guardar el TTL original, al renovar no habría con qué extenderla.

- [ ] **Step 2: Instalar el driver adapter, generar el cliente y migrar**

```bash
npm install @prisma/adapter-pg@7.10.0 pg@8.23.0
npm run db:up
npx prisma migrate dev --name init
```

Verificar que `package.json` haya quedado con las dos versiones **exactas**, sin `^`:
npm las escribe con caret por defecto y las constraints piden pin exacto.

**Despues de corregir los pins a mano, volver a correr `npm install` sin argumentos.**
El bloque raiz del `package-lock.json` espeja los specifiers de `package.json`, y
editar solo el `package.json` los deja desincronizados: `npm ci` compara los dos y
falla. Corregir uno de los dos archivos nunca alcanza.

Expected: crea `prisma/migrations/<timestamp>_init/` y genera el cliente en
`src/generated/prisma`.

Si `prisma generate` avisa que el formato de módulo no coincide con este proyecto ESM,
agregar `moduleFormat = "esm"` dentro del bloque `generator client` y volver a correr
`npx prisma generate`.

- [ ] **Step 3: Escribir `backend/src/load-env.ts` y `backend/src/db/prisma.ts`**

```ts
// src/load-env.ts
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
```

```ts
// src/db/prisma.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type UserStatus = 'PENDING' | 'ACTIVE';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'Falta DATABASE_URL. ¿Importaste `load-env.js` antes que este módulo?',
  );
}

/**
 * Un solo cliente por proceso: cada `new PrismaClient()` abre su propio pool de
 * conexiones, y varios pools contra el mismo Postgres agotan los slots.
 *
 * Prisma 7 no trae motor propio: la conexión la abre el adapter sobre `pg`.
 */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
```

Los tipos `Role` y `UserStatus` se declaran a mano en vez de reexportar los enums
generados: Prisma acepta estos literales de string en las consultas, y así ningún
módulo de dominio depende de la ruta interna de la carpeta generada.

Y en `backend/src/main.ts`, reemplazar el bloque

```ts
try {
  process.loadEnvFile('.env');
} catch {
  // Sin archivo: las variables vienen del entorno.
}
```

por un import, que tiene que ser **el primero del archivo**:

```ts
import './load-env.js';
```

- [ ] **Step 4: Escribir `backend/tests/db.ts`**

```ts
import { prisma } from '../src/db/prisma.js';

/**
 * TRUNCATE en vez de recrear el esquema: recrearlo en cada test hace que la
 * suite tarde minutos. CASCADE se lleva las sesiones por la clave foránea.
 */
export async function limpiarBase(): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Session", "User" RESTART IDENTITY CASCADE');
}
```

- [ ] **Step 5: Escribir el test que falla, `backend/tests/seed.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { seedBootstrapAdmin } from '../prisma/seed.js';
import { limpiarBase } from './db.js';

describe('seedBootstrapAdmin', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('crea el primer administrador como PENDING', async () => {
    await seedBootstrapAdmin('Jefe@5848motors.com');

    const usuario = await prisma.user.findUnique({ where: { email: 'jefe@5848motors.com' } });
    expect(usuario).not.toBeNull();
    expect(usuario?.role).toBe('ADMIN');
    expect(usuario?.status).toBe('PENDING');
    expect(usuario?.googleSub).toBeNull();
  });

  it('normaliza el email a minúsculas', async () => {
    await seedBootstrapAdmin('JEFE@5848MOTORS.COM');
    expect(await prisma.user.count({ where: { email: 'jefe@5848motors.com' } })).toBe(1);
  });

  it('es idempotente y no pisa un admin ya activo', async () => {
    await seedBootstrapAdmin('jefe@5848motors.com');
    await prisma.user.update({
      where: { email: 'jefe@5848motors.com' },
      data: { status: 'ACTIVE', googleSub: 'google-123', name: 'Jefe Real' },
    });

    await seedBootstrapAdmin('jefe@5848motors.com');

    const usuario = await prisma.user.findUnique({ where: { email: 'jefe@5848motors.com' } });
    expect(usuario?.status).toBe('ACTIVE');
    expect(usuario?.googleSub).toBe('google-123');
    expect(usuario?.name).toBe('Jefe Real');
    expect(await prisma.user.count()).toBe(1);
  });
});
```

El tercer test es el que importa: correr el seed dos veces es normal (`db:reset`), y no puede degradar al administrador que ya entró.

- [ ] **Step 6: Correr el test y verificar que falla**

Run: `npm test -- seed`
Expected: FAIL — no existe `../prisma/seed.js`.

- [ ] **Step 7: Escribir `backend/prisma/seed.ts`**

```ts
import '../src/load-env.js';
import { pathToFileURL } from 'node:url';
import { prisma } from '../src/db/prisma.js';

/**
 * Crea el primer administrador. Nadie puede invitarlo: el login es solo por
 * invitación, así que sin esto no entra nadie nunca.
 *
 * Queda PENDING a propósito. Pasa a ACTIVE en su primer login con Google, que
 * es también cuando se le fija el googleSub.
 */
export async function seedBootstrapAdmin(email: string): Promise<void> {
  const normalizado = email.trim().toLowerCase();

  await prisma.user.upsert({
    where: { email: normalizado },
    update: {},
    create: {
      email: normalizado,
      name: normalizado.split('@')[0] ?? normalizado,
      role: 'ADMIN',
      status: 'PENDING',
    },
  });
}

// Ejecutable directo: `tsx prisma/seed.ts`
//
// Compara con `pathToFileURL`, no con `file://${process.argv[1]}`: en Windows
// argv[1] trae barras invertidas y sin escapar (`C:\...\seed.ts`), mientras que
// `import.meta.url` es una URL bien formada (`file:///C:/.../seed.ts`). Concatenar
// a mano nunca coincide, y el seed se convierte en un no-op silencioso.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    console.error('Falta BOOTSTRAP_ADMIN_EMAIL en .env');
    process.exit(1);
  }

  await seedBootstrapAdmin(email);
  console.log(`Administrador inicial listo: ${email.toLowerCase()}`);
  await prisma.$disconnect();
}
```

El `update: {}` del upsert es la clave de la idempotencia: si el usuario ya existe, no se toca nada.

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `npm test -- seed`
Expected: PASS, 3 tests.

- [ ] **Step 9: Agregar los scripts de base**

```bash
npm pkg set scripts.db:migrate="prisma migrate dev"
npm pkg set scripts.db:seed="tsx prisma/seed.ts"
npm pkg set scripts.db:reset="docker compose down -v && docker compose up -d --wait && prisma migrate deploy && tsx prisma/seed.ts"
```

- [ ] **Step 10: Aplicar las migraciones a la base de tests**

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.test | cut -d= -f2-) npx prisma migrate deploy
```

Expected: aplica la migración `init` sobre `motors_test`. Sin esto, todo test que toque la base falla con "table does not exist".

- [ ] **Step 11: Correr toda la suite**

Run: `npm test && npm run typecheck`
Expected: PASS, 9 tests.

- [ ] **Step 12: Commit**

```bash
cd .. && git add backend && git commit -m "feat(backend): esquema Prisma, migracion inicial y seed del primer admin"
```

---

## Task 3: Sentry con depuración de datos sensibles

**Files:**
- Create: `backend/src/observability/sentry.ts`
- Test: `backend/tests/sentry.test.ts`
- Modify: `backend/src/main.ts`

**Interfaces:**
- Consumes: `Env` (Task 1).
- Produces:
  - `scrubEvent(event: SentryEvent): SentryEvent` — función pura.
  - `initSentry(env: Env): boolean` — `false` si no hay DSN.

- [ ] **Step 1: Escribir el test que falla, `backend/tests/sentry.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { initSentry, scrubEvent } from '../src/observability/sentry.js';

describe('scrubEvent', () => {
  it('borra el código de OAuth de la URL', () => {
    const evento = scrubEvent({
      request: {
        url: 'http://localhost:4000/auth/google/callback?code=4/0Ax7SECRETO&state=abc123&scope=openid',
      },
    });

    expect(evento.request?.url).not.toContain('4/0Ax7SECRETO');
    expect(evento.request?.url).not.toContain('abc123');
    expect(evento.request?.url).toContain('code=%5Bdepurado%5D');
    expect(evento.request?.url).toContain('scope=openid');
  });

  it('borra cookies y el header Authorization', () => {
    const evento = scrubEvent({
      request: {
        url: 'http://localhost:4000/users',
        cookies: { motors_session: 'token-de-sesion-real' },
        headers: {
          cookie: 'motors_session=token-de-sesion-real',
          authorization: 'Bearer secreto',
          'user-agent': 'Firefox',
        },
      },
    });

    expect(evento.request?.cookies).toBeUndefined();
    expect(evento.request?.headers?.cookie).toBeUndefined();
    expect(evento.request?.headers?.authorization).toBeUndefined();
    expect(evento.request?.headers?.['user-agent']).toBe('Firefox');
  });

  it('borra el cuerpo de los requests a /auth', () => {
    const evento = scrubEvent({
      request: { url: 'http://localhost:4000/auth/logout', data: { algo: 'sensible' } },
    });
    expect(evento.request?.data).toBeUndefined();
  });

  it('conserva el cuerpo de los requests que no son de auth', () => {
    const evento = scrubEvent({
      request: { url: 'http://localhost:4000/users', data: { email: 'a@b.com' } },
    });
    expect(evento.request?.data).toEqual({ email: 'a@b.com' });
  });

  it('del usuario deja solo el id', () => {
    const evento = scrubEvent({
      user: { id: 'user-1', email: 'jefe@5848motors.com', username: 'Jefe' },
    });
    expect(evento.user).toEqual({ id: 'user-1' });
  });

  it('borra query_string, que es donde Sentry deja la query cruda', () => {
    const evento = scrubEvent({
      request: {
        url: 'http://localhost:4000/auth/google/callback?code=4/0Ax7SECRETO',
        query_string: 'code=4/0Ax7SECRETO&state=abc123&scope=openid',
      },
    });

    expect(evento.request?.query_string).toBeUndefined();
  });

  it('con una URL que no parsea falla cerrado y no explota', () => {
    const evento = scrubEvent({
      request: { url: '/auth/callback?code=SECRETO123&state=xyz', data: { algo: 'sensible' } },
    });

    expect(evento.request?.url).toBe('[depurado]');
    expect(evento.request?.url).not.toContain('SECRETO123');
    // Sin poder leer el path, no se puede descartar que sea /auth: se borra igual.
    expect(evento.request?.data).toBeUndefined();
  });

  it('borra headers sensibles sin importar como esten capitalizados', () => {
    const evento = scrubEvent({
      request: {
        url: 'http://localhost:4000/users',
        headers: { Cookie: 'motors_session=real', Authorization: 'Bearer secreto' },
      },
    });

    expect(evento.request?.headers?.Cookie).toBeUndefined();
    expect(evento.request?.headers?.Authorization).toBeUndefined();
  });

  it('no explota con un evento vacío', () => {
    expect(() => scrubEvent({})).not.toThrow();
  });
});

describe('initSentry', () => {
  const base = {
    NODE_ENV: 'test' as const,
    PORT: 4000,
    DATABASE_URL: 'postgresql://u:p@localhost:5432/motors',
    APP_ORIGIN: 'http://localhost:3000',
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
    SESSION_COOKIE_SECRET: 'x'.repeat(32),
    SENTRY_ENVIRONMENT: 'test',
    SENTRY_TRACES_SAMPLE_RATE: 0.1,
  };

  it('sin DSN no se inicializa', () => {
    expect(initSentry({ ...base, SENTRY_DSN: undefined })).toBe(false);
  });
});
```

El import del test pasa a ser `import { initSentry, scrubEvent } from '../src/observability/sentry.js';`.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- sentry`
Expected: FAIL — no existe `../src/observability/sentry.js`.

- [ ] **Step 3: Escribir `backend/src/observability/sentry.ts`**

```ts
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
    beforeSend: (event) => scrubEvent(event as SentryEvent) as typeof event,
  });

  return true;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- sentry`
Expected: PASS, 10 tests.

- [ ] **Step 5: Inicializar Sentry en `backend/src/main.ts`**

`main.ts` ya arranca con `import './load-env.js';` desde la Task 2. **Ese import se
conserva y sigue siendo el primero**: no vuelvas a poner el `process.loadEnvFile`
inline. El archivo queda asi:

```ts
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
```

- [ ] **Step 6: Verificar la suite completa**

Run: `npm test && npm run typecheck`
Expected: PASS, 19 tests.

- [ ] **Step 7: Commit**

```bash
cd .. && git add backend && git commit -m "feat(backend): Sentry con depuracion de cookies, codigos OAuth y tokens"
```

---

## Task 4: Sesiones

**Files:**
- Create: `backend/src/auth/session.ts`
- Test: `backend/tests/session.test.ts`

**Interfaces:**
- Consumes: `prisma`, `Role`, `UserStatus` (Task 2).
- Produces:
  - `SESSION_COOKIE = 'motors_session'`
  - `TTL_CORTO_MS`, `TTL_LARGO_MS`
  - `interface SessionUser { id: string; name: string; email: string; role: Role; status: UserStatus }`
  - `createSession(input: { userId: string; ttlMs: number; userAgent?: string; ip?: string }): Promise<string>` — devuelve el token **en crudo**, el único momento en que existe.
  - `resolveSession(token: string, ahora?: Date): Promise<SessionUser | null>`
  - `revokeSession(token: string): Promise<void>`
  - `revokeAllSessions(userId: string): Promise<void>`

- [ ] **Step 1: Escribir el test que falla, `backend/tests/session.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createSession,
  resolveSession,
  revokeAllSessions,
  revokeSession,
  TTL_CORTO_MS,
} from '../src/auth/session.js';
import { prisma } from '../src/db/prisma.js';
import { limpiarBase } from './db.js';

async function crearUsuario() {
  return prisma.user.create({
    data: { email: 'jefe@5848motors.com', name: 'Jefe', role: 'ADMIN', status: 'ACTIVE' },
  });
}

describe('sesiones', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('resuelve una sesión recién creada', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    const sesion = await resolveSession(token);
    expect(sesion?.id).toBe(usuario.id);
    expect(sesion?.role).toBe('ADMIN');
  });

  it('nunca guarda el token en crudo', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    const fila = await prisma.session.findFirst();
    expect(fila?.tokenHash).not.toBe(token);
    expect(fila?.tokenHash).toHaveLength(64);
  });

  it('rechaza un token inexistente', async () => {
    expect(await resolveSession('token-inventado')).toBeNull();
  });

  it('rechaza una sesión expirada', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    const futuro = new Date(Date.now() + TTL_CORTO_MS + 1000);
    expect(await resolveSession(token, futuro)).toBeNull();
  });

  it('rechaza una sesión revocada', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    await revokeSession(token);
    expect(await resolveSession(token)).toBeNull();
  });

  it('rechaza la sesión de un usuario que volvió a PENDING', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    await prisma.user.update({ where: { id: usuario.id }, data: { status: 'PENDING' } });
    expect(await resolveSession(token)).toBeNull();
  });

  it('rechaza la sesión de un usuario borrado', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    await prisma.user.delete({ where: { id: usuario.id } });
    expect(await resolveSession(token)).toBeNull();
  });

  it('no renueva la expiración antes de la hora', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
    const antes = await prisma.session.findFirst();

    await resolveSession(token, new Date(Date.now() + 30 * 60 * 1000));

    const despues = await prisma.session.findFirst();
    expect(despues?.expiresAt.getTime()).toBe(antes?.expiresAt.getTime());
  });

  it('renueva la expiración pasada la hora', async () => {
    const usuario = await crearUsuario();
    const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
    const antes = await prisma.session.findFirst();

    await resolveSession(token, new Date(Date.now() + 61 * 60 * 1000));

    const despues = await prisma.session.findFirst();
    expect(despues!.expiresAt.getTime()).toBeGreaterThan(antes!.expiresAt.getTime());
  });

  it('revokeAllSessions corta todas las del usuario', async () => {
    const usuario = await crearUsuario();
    const uno = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
    const dos = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });

    await revokeAllSessions(usuario.id);

    expect(await resolveSession(uno)).toBeNull();
    expect(await resolveSession(dos)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- session`
Expected: FAIL — no existe `../src/auth/session.js`.

- [ ] **Step 3: Escribir `backend/src/auth/session.ts`**

```ts
import { createHash, randomBytes } from 'node:crypto';
import { prisma, type Role, type UserStatus } from '../db/prisma.js';

export const SESSION_COOKIE = 'motors_session';

export const TTL_CORTO_MS = 12 * 60 * 60 * 1000; // 12 horas
export const TTL_LARGO_MS = 30 * 24 * 60 * 60 * 1000; // 30 días, con "recordarme"

/** Ventana mínima entre renovaciones: sin esto, cada request sería un UPDATE. */
const VENTANA_RENOVACION_MS = 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}

/** 256 bits. La cookie lleva esto; la base, solo su hash. */
function generarToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashear(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Devuelve el token en crudo: es la única vez que existe fuera del navegador. */
export async function createSession(input: {
  userId: string;
  ttlMs: number;
  userAgent?: string;
  ip?: string;
}): Promise<string> {
  const token = generarToken();
  const ahora = new Date();

  await prisma.session.create({
    data: {
      tokenHash: hashear(token),
      userId: input.userId,
      ttlMs: input.ttlMs,
      createdAt: ahora,
      lastSeenAt: ahora,
      expiresAt: new Date(ahora.getTime() + input.ttlMs),
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    },
  });

  return token;
}

/**
 * Devuelve el usuario si la sesión sirve, o `null`. Renueva la expiración de
 * forma deslizante, pero como mucho una vez por hora.
 */
export async function resolveSession(
  token: string,
  ahora: Date = new Date(),
): Promise<SessionUser | null> {
  const sesion = await prisma.session.findUnique({
    where: { tokenHash: hashear(token) },
    include: { user: true },
  });

  if (!sesion) return null;
  if (sesion.revokedAt) return null;
  if (sesion.expiresAt <= ahora) return null;
  if (sesion.user.status !== 'ACTIVE') return null;

  if (ahora.getTime() - sesion.lastSeenAt.getTime() >= VENTANA_RENOVACION_MS) {
    await prisma.session.update({
      where: { id: sesion.id },
      data: { lastSeenAt: ahora, expiresAt: new Date(ahora.getTime() + sesion.ttlMs) },
    });
  }

  return {
    id: sesion.user.id,
    name: sesion.user.name,
    email: sesion.user.email,
    role: sesion.user.role as Role,
    status: sesion.user.status as UserStatus,
  };
}

/** Idempotente: revocar algo inexistente no es un error. */
export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: hashear(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Se usa al borrar o degradar a alguien: no puede seguir adentro. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- session`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
cd .. && git add backend && git commit -m "feat(backend): sesiones opacas con hash, expiracion deslizante y revocacion"
```

---

## Task 5: Guards de sesión y rol

**Files:**
- Create: `backend/src/auth/guard.ts`
- Test: `backend/tests/guard.test.ts`

**Interfaces:**
- Consumes: `resolveSession`, `SESSION_COOKIE`, `SessionUser`, `createSession`, `TTL_CORTO_MS` (Task 4); `sendError` (Task 1); `buildApp` (Task 1).
- Produces:
  - `requireSession` — `preHandler` de Fastify.
  - `requireRole(...roles: Role[])` — devuelve un `preHandler`.
  - Ampliación de tipos: `FastifyRequest.user?: SessionUser`.

- [ ] **Step 1: Escribir el test que falla, `backend/tests/guard.test.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { requireRole, requireSession } from '../src/auth/guard.js';
import { createSession, SESSION_COOKIE, TTL_CORTO_MS } from '../src/auth/session.js';
import { prisma, type Role } from '../src/db/prisma.js';
import { loadEnv } from '../src/env.js';
import { limpiarBase } from './db.js';

const env = loadEnv({
  // Sin esto, NODE_ENV cae en 'development' y Fastify escupe logs JSON de cada
  // request en la salida de los tests. La salida tiene que quedar limpia.
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL,
  APP_ORIGIN: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  SESSION_COOKIE_SECRET: 'x'.repeat(32),
});

async function appDePrueba(): Promise<FastifyInstance> {
  const app = await buildApp({ env });
  app.get('/privado', { preHandler: requireSession }, async (request) => ({
    email: request.user!.email,
  }));
  app.post('/solo-admin', { preHandler: [requireSession, requireRole('ADMIN')] }, async () => ({
    ok: true,
  }));
  return app;
}

async function usuarioConSesion(role: Role) {
  const usuario = await prisma.user.create({
    data: { email: `${role.toLowerCase()}@5848motors.com`, name: role, role, status: 'ACTIVE' },
  });
  const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
  return { usuario, cookie: `${SESSION_COOKIE}=${token}` };
}

describe('guards', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sin cookie devuelve 401', async () => {
    const app = await appDePrueba();
    const r = await app.inject({ method: 'GET', url: '/privado' });
    expect(r.statusCode).toBe(401);
    expect(r.json().error).toMatch(/sesión/i);
    await app.close();
  });

  it('con una cookie inventada devuelve 401', async () => {
    const app = await appDePrueba();
    const r = await app.inject({
      method: 'GET',
      url: '/privado',
      headers: { cookie: `${SESSION_COOKIE}=inventado` },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('con sesión válida deja pasar y expone el usuario', async () => {
    const app = await appDePrueba();
    const { cookie } = await usuarioConSesion('EDITOR');

    const r = await app.inject({ method: 'GET', url: '/privado', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.json().email).toBe('editor@5848motors.com');
    await app.close();
  });

  it('un EDITOR no entra a una ruta de ADMIN', async () => {
    const app = await appDePrueba();
    const { cookie } = await usuarioConSesion('EDITOR');

    const r = await app.inject({ method: 'POST', url: '/solo-admin', headers: { cookie } });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('un VIEWER no entra a una ruta de ADMIN', async () => {
    const app = await appDePrueba();
    const { cookie } = await usuarioConSesion('VIEWER');

    const r = await app.inject({ method: 'POST', url: '/solo-admin', headers: { cookie } });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('un ADMIN entra', async () => {
    const app = await appDePrueba();
    const { cookie } = await usuarioConSesion('ADMIN');

    const r = await app.inject({ method: 'POST', url: '/solo-admin', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    await app.close();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- guard`
Expected: FAIL — no existe `../src/auth/guard.js`.

- [ ] **Step 3: Escribir `backend/src/auth/guard.ts`**

```ts
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { Role } from '../db/prisma.js';
import { sendError } from '../http/errors.js';
import { resolveSession, SESSION_COOKIE, type SessionUser } from './session.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

/** Traduce la cookie a `request.user`. Es el único punto que lee la cookie. */
export const requireSession: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) {
    return sendError(reply, 401, 'Necesitás iniciar sesión.');
  }

  const usuario = await resolveSession(token);
  if (!usuario) {
    // Cookie vencida, revocada o de un usuario que ya no está: que el navegador la tire.
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return sendError(reply, 401, 'Tu sesión expiró. Volvé a iniciar sesión.');
  }

  request.user = usuario;
};

/** Va siempre después de `requireSession`. */
export function requireRole(...roles: Role[]): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return sendError(reply, 401, 'Necesitás iniciar sesión.');
    }
    if (!roles.includes(request.user.role)) {
      return sendError(reply, 403, 'No tenés permisos para hacer esto.');
    }
  };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- guard`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
cd .. && git add backend && git commit -m "feat(backend): guards de sesion y rol"
```

---

## Task 6: Cliente OIDC de Google

**Files:**
- Create: `backend/src/auth/oidc.ts`
- Test: `backend/tests/oidc.test.ts`

**Interfaces:**
- Consumes: `Env` (Task 1).
- Produces:
  - `interface GoogleIdentity { sub: string; email: string; emailVerified: boolean; name: string }`
  - `interface OidcClient { buildAuthUrl(i): URL; exchange(i): Promise<GoogleIdentity> }`
  - `createGoogleOidcClient(env: Env): Promise<OidcClient>`
  - `GOOGLE_ISSUER = 'https://accounts.google.com'`
  - `identityFromClaims(claims: unknown): GoogleIdentity` — exportada para poder testear el mapeo sin red.

- [ ] **Step 1: Escribir el test que falla, `backend/tests/oidc.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { identityFromClaims } from '../src/auth/oidc.js';

describe('identityFromClaims', () => {
  it('mapea los claims de un ID token de Google', () => {
    const identidad = identityFromClaims({
      sub: '1029384756',
      email: 'Jefe@5848Motors.com',
      email_verified: true,
      name: 'Jefe Motors',
    });

    expect(identidad).toEqual({
      sub: '1029384756',
      email: 'jefe@5848motors.com',
      emailVerified: true,
      name: 'Jefe Motors',
    });
  });

  it('usa la parte local del email si no vino el nombre', () => {
    const identidad = identityFromClaims({
      sub: '1',
      email: 'jefe@5848motors.com',
      email_verified: true,
    });
    expect(identidad.name).toBe('jefe');
  });

  it('marca emailVerified en false si el claim no vino', () => {
    const identidad = identityFromClaims({ sub: '1', email: 'a@b.com' });
    expect(identidad.emailVerified).toBe(false);
  });

  it('falla si no hay sub', () => {
    expect(() => identityFromClaims({ email: 'a@b.com' })).toThrow(/sub/);
  });

  it('falla si no hay email', () => {
    expect(() => identityFromClaims({ sub: '1' })).toThrow(/email/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- oidc`
Expected: FAIL — no existe `../src/auth/oidc.js`.

- [ ] **Step 3: Escribir `backend/src/auth/oidc.ts`**

```ts
import * as client from 'openid-client';
import type { Env } from '../env.js';

export const GOOGLE_ISSUER = 'https://accounts.google.com';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export interface OidcClient {
  buildAuthUrl(input: { state: string; nonce: string; codeChallenge: string }): URL;
  exchange(input: {
    currentUrl: URL;
    codeVerifier: string;
    expectedState: string;
    expectedNonce: string;
  }): Promise<GoogleIdentity>;
}

/**
 * Separado del cliente real para poder testear el mapeo sin salir a la red.
 * openid-client ya validó firma, `iss`, `aud`, `exp` y `nonce` antes de esto.
 */
export function identityFromClaims(claims: unknown): GoogleIdentity {
  const c = claims as Record<string, unknown> | null | undefined;

  const sub = typeof c?.sub === 'string' ? c.sub : '';
  if (!sub) throw new Error('El ID token no trae sub');

  const email = typeof c?.email === 'string' ? c.email.trim().toLowerCase() : '';
  if (!email) throw new Error('El ID token no trae email');

  const nombre = typeof c?.name === 'string' && c.name.trim() ? c.name.trim() : email.split('@')[0]!;

  return { sub, email, emailVerified: c?.email_verified === true, name: nombre };
}

/**
 * Descubre la configuración de Google una sola vez, al arrancar. openid-client
 * está certificado como Relying Party: valida firma contra las JWKS, `iss`,
 * `aud`, `exp` y `nonce`. Escribir eso a mano es donde aparecen los agujeros.
 */
export async function createGoogleOidcClient(env: Env): Promise<OidcClient> {
  const config = await client.discovery(
    new URL(GOOGLE_ISSUER),
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  );

  return {
    buildAuthUrl({ state, nonce, codeChallenge }) {
      return client.buildAuthorizationUrl(config, {
        redirect_uri: env.OAUTH_REDIRECT_URI,
        // Solo identidad: no pedimos permisos sobre datos de Google.
        scope: 'openid email profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
      });
    },

    async exchange({ currentUrl, codeVerifier, expectedState, expectedNonce }) {
      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: codeVerifier,
        expectedState,
        expectedNonce,
      });

      // Los tokens de Google se descartan acá: identificado el usuario, la sesión es nuestra.
      return identityFromClaims(tokens.claims());
    },
  };
}

export const generarState = client.randomState;
export const generarNonce = client.randomNonce;
export const generarCodeVerifier = client.randomPKCECodeVerifier;
export const calcularCodeChallenge = client.calculatePKCECodeChallenge;
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- oidc`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
cd .. && git add backend && git commit -m "feat(backend): cliente OIDC de Google detras de una interfaz inyectable"
```

---

## Task 7: Rutas de autenticación

**Files:**
- Create: `backend/src/auth/routes.ts`
- Test: `backend/tests/auth-routes.test.ts`
- Modify: `backend/src/app.ts`, `backend/src/main.ts`

**Interfaces:**
- Consumes: `OidcClient`, `GoogleIdentity`, `generarState`, `generarNonce`, `generarCodeVerifier`, `calcularCodeChallenge` (Task 6); sesiones (Task 4); `requireSession` (Task 5).
- Produces:
  - `registerAuthRoutes(app, deps: { env: Env; oidc: OidcClient }): void`
  - `AppDeps` pasa a ser `{ env: Env; oidc: OidcClient }`
  - `OAUTH_COOKIE = 'motors_oauth'`

- [ ] **Step 1: Escribir el test que falla, `backend/tests/auth-routes.test.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { GoogleIdentity, OidcClient } from '../src/auth/oidc.js';
import { SESSION_COOKIE } from '../src/auth/session.js';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { loadEnv } from '../src/env.js';
import { limpiarBase } from './db.js';

const env = loadEnv({
  // Sin esto, NODE_ENV cae en 'development' y Fastify escupe logs JSON de cada
  // request en la salida de los tests. La salida tiene que quedar limpia.
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL,
  APP_ORIGIN: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  SESSION_COOKIE_SECRET: 'x'.repeat(32),
});

/** Doble del cliente OIDC: los tests nunca hablan con Google. */
function oidcFalso(identidad: GoogleIdentity | Error): OidcClient {
  return {
    buildAuthUrl: ({ state, nonce, codeChallenge }) => {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('state', state);
      url.searchParams.set('nonce', nonce);
      url.searchParams.set('code_challenge', codeChallenge);
      return url;
    },
    exchange: async () => {
      if (identidad instanceof Error) throw identidad;
      return identidad;
    },
  };
}

const IDENTIDAD: GoogleIdentity = {
  sub: 'google-sub-1',
  email: 'jefe@5848motors.com',
  emailVerified: true,
  name: 'Jefe Motors',
};

/** Arranca el flujo y devuelve la cookie de state que hay que devolver al callback. */
async function iniciarFlujo(app: FastifyInstance, url = '/auth/google') {
  const inicio = await app.inject({ method: 'GET', url });
  const cookies = inicio.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const location = new URL(inicio.headers.location as string);
  return { cookies, state: location.searchParams.get('state')! };
}

describe('rutas de auth', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /auth/google redirige a Google y deja la cookie de state', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const r = await app.inject({ method: 'GET', url: '/auth/google' });

    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toContain('accounts.google.com');
    expect(r.cookies.some((c) => c.name === 'motors_oauth')).toBe(true);
    await app.close();
  });

  it('el callback sin cookie de state redirige con error', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const r = await app.inject({ method: 'GET', url: '/auth/google/callback?code=x&state=y' });

    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toBe('http://localhost:3000/login?error=sesion_expirada');
    await app.close();
  });

  it('el callback con un state que no coincide redirige con error', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=x&state=otro-state',
      headers: { cookie: cookies },
    });

    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toBe('http://localhost:3000/login?error=state_invalido');
    await app.close();
  });

  it('rechaza un email no invitado y no crea sesión', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    expect(r.headers.location).toBe('http://localhost:3000/login?error=no_invitado');
    expect(await prisma.session.count()).toBe(0);
    await app.close();
  });

  it('rechaza un email sin verificar', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'PENDING' },
    });
    const app = await buildApp({
      env,
      oidc: oidcFalso({ ...IDENTIDAD, emailVerified: false }),
    });
    const { cookies, state } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    expect(r.headers.location).toBe('http://localhost:3000/login?error=email_sin_verificar');
    expect(await prisma.session.count()).toBe(0);
    await app.close();
  });

  it('activa al usuario PENDING, le fija el googleSub y crea sesión', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'PENDING' },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    expect(r.headers.location).toBe('http://localhost:3000/admin');

    const usuario = await prisma.user.findUnique({ where: { email: IDENTIDAD.email } });
    expect(usuario?.status).toBe('ACTIVE');
    expect(usuario?.googleSub).toBe('google-sub-1');
    expect(usuario?.lastLoginAt).not.toBeNull();

    const sesion = r.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(sesion?.httpOnly).toBe(true);
    expect(sesion?.sameSite?.toLowerCase()).toBe('lax');
    expect(await prisma.session.count()).toBe(1);
    await app.close();
  });

  it('rechaza a alguien que reclama un email con otro googleSub', async () => {
    await prisma.user.create({
      data: {
        email: IDENTIDAD.email,
        name: 'Jefe',
        role: 'ADMIN',
        status: 'ACTIVE',
        googleSub: 'otro-sub',
      },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const r = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    expect(r.headers.location).toBe('http://localhost:3000/login?error=cuenta_en_conflicto');
    expect(await prisma.session.count()).toBe(0);
    await app.close();
  });

  it('con remember=1 la sesión dura 30 días', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'ACTIVE' },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app, '/auth/google?remember=1');

    await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });

    const sesion = await prisma.session.findFirst();
    expect(sesion?.ttlMs).toBe(30 * 24 * 60 * 60 * 1000);
    await app.close();
  });

  it('GET /auth/me devuelve el usuario logueado y 401 sin sesión', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'ACTIVE' },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const login = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });
    const sesion = login.cookies.find((c) => c.name === SESSION_COOKIE)!;

    const conSesion = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: `${SESSION_COOKIE}=${sesion.value}` },
    });
    expect(conSesion.statusCode).toBe(200);
    expect(conSesion.json().user.email).toBe(IDENTIDAD.email);
    expect(conSesion.json().user.role).toBe('Administrador');

    const sinSesion = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(sinSesion.statusCode).toBe(401);
    await app.close();
  });

  it('el logout revoca la sesión de verdad', async () => {
    await prisma.user.create({
      data: { email: IDENTIDAD.email, name: 'Jefe', role: 'ADMIN', status: 'ACTIVE' },
    });
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const { cookies, state } = await iniciarFlujo(app);

    const login = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=x&state=${state}`,
      headers: { cookie: cookies },
    });
    const cookieSesion = `${SESSION_COOKIE}=${login.cookies.find((c) => c.name === SESSION_COOKIE)!.value}`;

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: cookieSesion },
    });
    expect(logout.statusCode).toBe(204);

    const despues = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookieSesion },
    });
    expect(despues.statusCode).toBe(401);
    await app.close();
  });

  it('el logout sin sesión también responde 204', async () => {
    const app = await buildApp({ env, oidc: oidcFalso(IDENTIDAD) });
    const r = await app.inject({ method: 'POST', url: '/auth/logout' });
    expect(r.statusCode).toBe(204);
    await app.close();
  });
});
```

El spec lista "cookie de state vencida" como caso de test y acá no aparece como
test propio a propósito: la cookie tiene `maxAge` de 10 minutos, así que vencida
**el navegador directamente no la manda**. Eso llega al servidor como "sin cookie de
state", que es el segundo test. Un test que fuerce el vencimiento estaría probando
al navegador, no a nuestro código.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- auth-routes`
Expected: FAIL — `buildApp` no acepta `oidc`.

- [ ] **Step 3: Escribir `backend/src/users/roles.ts`** (primero: `auth/routes.ts` lo importa)

```ts
import type { Role } from '../db/prisma.js';

/** El frontend ya habla en etiquetas: la traducción vive en el borde HTTP. */
export const ETIQUETA_POR_ROL: Record<Role, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  VIEWER: 'Solo lectura',
};

/** Lo que manda `/admin/configuracion` al invitar. */
export const ROL_POR_CLAVE: Record<string, Role> = {
  admin: 'ADMIN',
  editor: 'EDITOR',
  viewer: 'VIEWER',
};
```

- [ ] **Step 4: Escribir `backend/src/auth/routes.ts`**

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Env } from '../env.js';
import { prisma } from '../db/prisma.js';
import { ETIQUETA_POR_ROL } from '../users/roles.js';
import { requireSession } from './guard.js';
import {
  calcularCodeChallenge,
  generarCodeVerifier,
  generarNonce,
  generarState,
  type OidcClient,
} from './oidc.js';
import {
  createSession,
  revokeSession,
  SESSION_COOKIE,
  TTL_CORTO_MS,
  TTL_LARGO_MS,
} from './session.js';

export const OAUTH_COOKIE = 'motors_oauth';

/** Vida de la cookie de state: lo que tarda una persona en loguearse, no más. */
const OAUTH_COOKIE_MAX_AGE_S = 10 * 60;

interface EstadoOauth {
  state: string;
  nonce: string;
  codeVerifier: string;
  remember: boolean;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  deps: { env: Env; oidc: OidcClient },
): void {
  const { env, oidc } = deps;

  const volverA = (destino: string) => new URL(destino, env.APP_ORIGIN).toString();
  const fallar = (reply: FastifyReply, codigo: string) => {
    reply.clearCookie(OAUTH_COOKIE, { path: '/' });
    return reply.redirect(volverA(`/login?error=${codigo}`), 302);
  };

  app.get('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const codeVerifier = generarCodeVerifier();
    const codeChallenge = await calcularCodeChallenge(codeVerifier);

    const estado: EstadoOauth = {
      state: generarState(),
      nonce: generarNonce(),
      codeVerifier,
      remember: (request.query as { remember?: string }).remember === '1',
    };

    // Firmada: el flag `remember` y el `state` no pueden alterarse en el camino.
    reply.setCookie(OAUTH_COOKIE, JSON.stringify(estado), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      signed: true,
      maxAge: OAUTH_COOKIE_MAX_AGE_S,
    });

    const destino = oidc.buildAuthUrl({
      state: estado.state,
      nonce: estado.nonce,
      codeChallenge,
    });

    return reply.redirect(destino.toString(), 302);
  });

  app.get('/auth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const crudo = request.cookies[OAUTH_COOKIE];
    if (!crudo) return fallar(reply, 'sesion_expirada');

    const desfirmada = request.unsignCookie(crudo);
    if (!desfirmada.valid || !desfirmada.value) return fallar(reply, 'state_invalido');

    let estado: EstadoOauth;
    try {
      estado = JSON.parse(desfirmada.value) as EstadoOauth;
    } catch {
      return fallar(reply, 'state_invalido');
    }

    const query = request.query as { state?: string; code?: string; error?: string };
    if (query.error) return fallar(reply, 'google_rechazo');
    if (!query.state || query.state !== estado.state) return fallar(reply, 'state_invalido');

    // openid-client vuelve a leer `code` y `state` de la URL completa del callback.
    const queryString = request.raw.url?.includes('?')
      ? request.raw.url.slice(request.raw.url.indexOf('?'))
      : '';

    let identidad;
    try {
      identidad = await oidc.exchange({
        currentUrl: new URL(env.OAUTH_REDIRECT_URI + queryString),
        codeVerifier: estado.codeVerifier,
        expectedState: estado.state,
        expectedNonce: estado.nonce,
      });
    } catch (error) {
      request.log.warn({ err: error }, 'fallo el intercambio del code con Google');
      return fallar(reply, 'google_fallo');
    }

    // Un email sin verificar no prueba nada: cualquiera pudo declararlo.
    if (!identidad.emailVerified) return fallar(reply, 'email_sin_verificar');

    const usuario = await prisma.user.findUnique({ where: { email: identidad.email } });

    // Solo por invitación: una cuenta de Google cualquiera no entra al panel.
    if (!usuario) return fallar(reply, 'no_invitado');

    // Alguien reclamando un email que ya está atado a otra cuenta de Google.
    if (usuario.googleSub && usuario.googleSub !== identidad.sub) {
      return fallar(reply, 'cuenta_en_conflicto');
    }

    const actualizado = await prisma.user.update({
      where: { id: usuario.id },
      data: {
        status: 'ACTIVE',
        googleSub: identidad.sub,
        lastLoginAt: new Date(),
        name: usuario.status === 'PENDING' ? identidad.name : usuario.name,
      },
    });

    const ttlMs = estado.remember ? TTL_LARGO_MS : TTL_CORTO_MS;
    const token = await createSession({
      userId: actualizado.id,
      ttlMs,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    reply.clearCookie(OAUTH_COOKIE, { path: '/' });
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      // Lax y no Strict: la vuelta desde Google es una navegación cross-site y
      // con Strict el navegador no manda la cookie.
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: Math.floor(ttlMs / 1000),
    });

    return reply.redirect(volverA('/admin'), 302);
  });

  app.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await revokeSession(token);

    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    // Idempotente: no es un canal para averiguar si una sesión existía.
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: requireSession }, async (request: FastifyRequest) => {
    const usuario = request.user!;
    return {
      user: {
        id: usuario.id,
        name: usuario.name,
        email: usuario.email,
        role: ETIQUETA_POR_ROL[usuario.role],
        status: usuario.status === 'ACTIVE' ? 'active' : 'pending',
      },
    };
  });
}
```

- [ ] **Step 5: Montar las rutas en `backend/src/app.ts`**

Reemplazar `AppDeps` y agregar el registro:

```ts
import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth/routes.js';
import type { OidcClient } from './auth/oidc.js';
import type { Env } from './env.js';

export interface AppDeps {
  env: Env;
  oidc: OidcClient;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: deps.env.NODE_ENV !== 'test',
    trustProxy: true,
  });

  await app.register(cookie, { secret: deps.env.SESSION_COOKIE_SECRET });

  app.get('/health', async () => ({ ok: true }));
  registerAuthRoutes(app, deps);

  return app;
}
```

- [ ] **Step 6: Actualizar `backend/tests/health.test.ts` y `backend/tests/guard.test.ts`**

Ambos llaman a `buildApp({ env })` y ahora falta `oidc`. Agregar en cada uno, antes del `describe`:

```ts
import type { OidcClient } from '../src/auth/oidc.js';

const oidcNoUsado: OidcClient = {
  buildAuthUrl: () => new URL('https://accounts.google.com'),
  exchange: async () => {
    throw new Error('no se usa en este test');
  },
};
```

y cambiar cada `buildApp({ env })` por `buildApp({ env, oidc: oidcNoUsado })`.

- [ ] **Step 7: Construir el cliente OIDC real en `backend/src/main.ts`**

Insertar antes de `const app = await buildApp(...)`:

```ts
import { createGoogleOidcClient } from './auth/oidc.js';

const oidc = await createGoogleOidcClient(env);
```

y cambiar la construcción a `const app = await buildApp({ env, oidc });`.

- [ ] **Step 8: Correr toda la suite**

Run: `npm test && npm run typecheck`
Expected: PASS, 42 tests.

- [ ] **Step 9: Commit**

```bash
cd .. && git add backend && git commit -m "feat(backend): flujo OIDC con PKCE, state firmado y sesion por cookie"
```

---

## Task 8: Endpoints de usuarios

**Files:**
- Create: `backend/src/users/repo.ts`, `backend/src/users/routes.ts`
- Test: `backend/tests/users-routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: guards (Task 5), `ETIQUETA_POR_ROL`, `ROL_POR_CLAVE` (Task 7), `revokeAllSessions` (Task 4).
- Produces:
  - `interface PanelUser { id: string; name: string; email: string; role: string; status: 'active' | 'pending' }`
  - `toPanelUser(fila): PanelUser`
  - `registerUserRoutes(app: FastifyInstance): void`

- [ ] **Step 1: Escribir el test que falla, `backend/tests/users-routes.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { OidcClient } from '../src/auth/oidc.js';
import { createSession, SESSION_COOKIE, TTL_CORTO_MS } from '../src/auth/session.js';
import { buildApp } from '../src/app.js';
import { prisma, type Role } from '../src/db/prisma.js';
import { loadEnv } from '../src/env.js';
import { limpiarBase } from './db.js';

const env = loadEnv({
  // Sin esto, NODE_ENV cae en 'development' y Fastify escupe logs JSON de cada
  // request en la salida de los tests. La salida tiene que quedar limpia.
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL,
  APP_ORIGIN: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  SESSION_COOKIE_SECRET: 'x'.repeat(32),
});

const oidcNoUsado: OidcClient = {
  buildAuthUrl: () => new URL('https://accounts.google.com'),
  exchange: async () => {
    throw new Error('no se usa en este test');
  },
};

async function sesionDe(role: Role, email = `${role.toLowerCase()}@5848motors.com`) {
  const usuario = await prisma.user.create({
    data: { email, name: role, role, status: 'ACTIVE' },
  });
  const token = await createSession({ userId: usuario.id, ttlMs: TTL_CORTO_MS });
  return { usuario, cookie: `${SESSION_COOKIE}=${token}` };
}

describe('rutas de usuarios', () => {
  beforeEach(limpiarBase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /users lista con las etiquetas que espera el frontend', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');
    await prisma.user.create({
      data: { email: 'edi@5848motors.com', name: 'Edi', role: 'EDITOR', status: 'PENDING' },
    });

    const r = await app.inject({ method: 'GET', url: '/users', headers: { cookie } });
    expect(r.statusCode).toBe(200);

    const usuarios = r.json().users as Array<{ email: string; role: string; status: string }>;
    const edi = usuarios.find((u) => u.email === 'edi@5848motors.com');
    expect(edi?.role).toBe('Editor');
    expect(edi?.status).toBe('pending');
    await app.close();
  });

  it('un EDITOR no puede listar usuarios', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('EDITOR');

    const r = await app.inject({ method: 'GET', url: '/users', headers: { cookie } });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('sin sesión devuelve 401', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const r = await app.inject({ method: 'GET', url: '/users' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /users invita a alguien como PENDING', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { cookie },
      payload: { email: 'Nuevo@5848Motors.com', role: 'editor' },
    });

    expect(r.statusCode).toBe(201);
    expect(r.json().user.role).toBe('Editor');
    expect(r.json().user.status).toBe('pending');

    const creado = await prisma.user.findUnique({ where: { email: 'nuevo@5848motors.com' } });
    expect(creado?.role).toBe('EDITOR');
    await app.close();
  });

  it('POST /users rechaza un email inválido', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { cookie },
      payload: { email: 'no-es-un-email', role: 'editor' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /users con un email repetido devuelve 409', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');

    const payload = { email: 'nuevo@5848motors.com', role: 'editor' };
    await app.inject({ method: 'POST', url: '/users', headers: { cookie }, payload });
    const r = await app.inject({ method: 'POST', url: '/users', headers: { cookie }, payload });

    expect(r.statusCode).toBe(409);
    await app.close();
  });

  it('PATCH /users/:id cambia el rol', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');
    const otro = await prisma.user.create({
      data: { email: 'edi@5848motors.com', name: 'Edi', role: 'EDITOR', status: 'ACTIVE' },
    });

    const r = await app.inject({
      method: 'PATCH',
      url: `/users/${otro.id}`,
      headers: { cookie },
      payload: { role: 'viewer' },
    });

    expect(r.statusCode).toBe(200);
    expect(r.json().user.role).toBe('Solo lectura');
    await app.close();
  });

  it('un ADMIN no puede degradarse a sí mismo', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { usuario, cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'PATCH',
      url: `/users/${usuario.id}`,
      headers: { cookie },
      payload: { role: 'viewer' },
    });

    expect(r.statusCode).toBe(409);
    await app.close();
  });

  it('un ADMIN no puede borrarse a sí mismo', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { usuario, cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'DELETE',
      url: `/users/${usuario.id}`,
      headers: { cookie },
    });
    expect(r.statusCode).toBe(409);
    await app.close();
  });

  it('borrar a alguien invalida su sesión abierta', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');
    const victima = await sesionDe('EDITOR', 'victima@5848motors.com');

    const antes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: victima.cookie },
    });
    expect(antes.statusCode).toBe(200);

    const borrado = await app.inject({
      method: 'DELETE',
      url: `/users/${victima.usuario.id}`,
      headers: { cookie },
    });
    expect(borrado.statusCode).toBe(204);

    const despues = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: victima.cookie },
    });
    expect(despues.statusCode).toBe(401);
    await app.close();
  });

  it('PATCH sobre un id inexistente devuelve 404', async () => {
    const app = await buildApp({ env, oidc: oidcNoUsado });
    const { cookie } = await sesionDe('ADMIN');

    const r = await app.inject({
      method: 'PATCH',
      url: '/users/no-existe',
      headers: { cookie },
      payload: { role: 'viewer' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- users-routes`
Expected: FAIL — la ruta `/users` no existe (404).

- [ ] **Step 3: Escribir `backend/src/users/repo.ts`**

```ts
import { prisma, type Role, type UserStatus } from '../db/prisma.js';
import { ETIQUETA_POR_ROL } from './roles.js';

/** Exactamente la forma que declara `frontend/src/types/index.ts`. */
export interface PanelUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
}

interface FilaUsuario {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export function toPanelUser(fila: FilaUsuario): PanelUser {
  return {
    id: fila.id,
    name: fila.name,
    email: fila.email,
    role: ETIQUETA_POR_ROL[fila.role as Role],
    status: (fila.status as UserStatus) === 'ACTIVE' ? 'active' : 'pending',
  };
}

export async function listUsers(): Promise<PanelUser[]> {
  const filas = await prisma.user.findMany({ orderBy: { invitedAt: 'asc' } });
  return filas.map(toPanelUser);
}

export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function inviteUser(email: string, role: Role): Promise<PanelUser> {
  const normalizado = email.trim().toLowerCase();
  const fila = await prisma.user.create({
    data: {
      email: normalizado,
      name: normalizado.split('@')[0] ?? normalizado,
      role,
      status: 'PENDING',
    },
  });
  return toPanelUser(fila);
}
```

- [ ] **Step 4: Escribir `backend/src/users/routes.ts`**

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireRole, requireSession } from '../auth/guard.js';
import { revokeAllSessions } from '../auth/session.js';
import { prisma } from '../db/prisma.js';
import { sendError } from '../http/errors.js';
import { findByEmail, inviteUser, listUsers, toPanelUser } from './repo.js';
import { ROL_POR_CLAVE } from './roles.js';

const soloAdmin = { preHandler: [requireSession, requireRole('ADMIN')] };

const invitacionSchema = z.object({
  email: z.email('Ingresá un email válido.'),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
});

const cambioSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  status: z.enum(['active', 'pending']).optional(),
});

export function registerUserRoutes(app: FastifyInstance): void {
  app.get('/users', soloAdmin, async () => ({ users: await listUsers() }));

  app.post('/users', soloAdmin, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = invitacionSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos.');
    }

    if (await findByEmail(parsed.data.email)) {
      return sendError(reply, 409, 'Ese email ya tiene acceso al panel.');
    }

    const usuario = await inviteUser(parsed.data.email, ROL_POR_CLAVE[parsed.data.role]!);
    return reply.status(201).send({ user: usuario });
  });

  app.patch('/users/:id', soloAdmin, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const parsed = cambioSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, 'Datos inválidos.');

    const objetivo = await prisma.user.findUnique({ where: { id } });
    if (!objetivo) return sendError(reply, 404, 'Ese usuario no existe.');

    // Sin esto el último administrador puede dejarse afuera y nadie puede volver a entrar.
    if (objetivo.id === request.user!.id && parsed.data.role && parsed.data.role !== 'admin') {
      return sendError(reply, 409, 'No podés quitarte a vos mismo el rol de administrador.');
    }

    const actualizado = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.role ? { role: ROL_POR_CLAVE[parsed.data.role]! } : {}),
        ...(parsed.data.status ? { status: parsed.data.status === 'active' ? 'ACTIVE' : 'PENDING' } : {}),
      },
    });

    // Bajar el rol o suspender no puede dejar viva una sesión con permisos viejos.
    await revokeAllSessions(id);

    return { user: toPanelUser(actualizado) };
  });

  app.delete('/users/:id', soloAdmin, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    if (id === request.user!.id) {
      return sendError(reply, 409, 'No podés borrarte a vos mismo.');
    }

    const objetivo = await prisma.user.findUnique({ where: { id } });
    if (!objetivo) return sendError(reply, 404, 'Ese usuario no existe.');

    // El onDelete: Cascade del esquema se lleva sus sesiones.
    await prisma.user.delete({ where: { id } });

    return reply.status(204).send();
  });
}
```

- [ ] **Step 5: Montar las rutas en `backend/src/app.ts`**

Agregar el import y la llamada después de `registerAuthRoutes(app, deps);`:

```ts
import { registerUserRoutes } from './users/routes.js';
// ...
  registerAuthRoutes(app, deps);
  registerUserRoutes(app);
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `npm test && npm run typecheck`
Expected: PASS, 53 tests.

- [ ] **Step 7: Commit**

```bash
cd .. && git add backend && git commit -m "feat(backend): endpoints de usuarios e invitaciones con guard de ADMIN"
```

---

## Task 9: Proxy y middleware en Next

**Files:**
- Create: `frontend/src/app/api/auth/[...path]/route.ts`, `frontend/src/middleware.ts`
- Modify: `frontend/src/app/api/settings/users/route.ts`, `frontend/src/app/api/settings/users/[id]/route.ts`
- Delete: `frontend/src/app/api/auth/login/`, `frontend/src/app/api/auth/register/`, `frontend/src/app/api/auth/recover/`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: rutas del backend (Tasks 7 y 8).
- Produces: `proxyToBackend(request, path)` desde `frontend/src/lib/proxy.ts`.

- [ ] **Step 1: Borrar las rutas simuladas**

```bash
cd frontend
rm -rf src/app/api/auth/login src/app/api/auth/register src/app/api/auth/recover
```

- [ ] **Step 2: Escribir `frontend/src/lib/proxy.ts`**

```ts
import type { NextRequest } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';

/**
 * Reenvía un request al backend conservando cookies en ambos sentidos.
 *
 * `redirect: 'manual'` no es opcional: con el `follow` por defecto, este fetch
 * seguiría el 302 hacia Google desde el servidor y el navegador nunca recibiría
 * el redirect, así que el login jamás arrancaría.
 */
export async function proxyToBackend(request: NextRequest, backendPath: string): Promise<Response> {
  const url = new URL(backendPath, BACKEND);
  url.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('accept-encoding');

  const tieneCuerpo = request.method !== 'GET' && request.method !== 'HEAD';

  const respuesta = await fetch(url, {
    method: request.method,
    headers,
    body: tieneCuerpo ? await request.text() : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  // Set-Cookie puede venir repetido y `new Headers(...)` lo colapsaría en uno solo.
  const salida = new Headers();
  respuesta.headers.forEach((valor, clave) => {
    if (clave.toLowerCase() === 'set-cookie') return;
    if (['content-encoding', 'content-length', 'transfer-encoding'].includes(clave.toLowerCase())) return;
    salida.set(clave, valor);
  });
  for (const cookie of respuesta.headers.getSetCookie()) {
    salida.append('set-cookie', cookie);
  }

  return new Response(respuesta.body, { status: respuesta.status, headers: salida });
}
```

- [ ] **Step 3: Escribir `frontend/src/app/api/auth/[...path]/route.ts`**

```ts
import type { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

type Contexto = { params: Promise<{ path: string[] }> };

async function reenviar(request: NextRequest, contexto: Contexto) {
  const { path } = await contexto.params;
  return proxyToBackend(request, `/auth/${path.join('/')}`);
}

export const GET = reenviar;
export const POST = reenviar;

export const dynamic = 'force-dynamic';
```

- [ ] **Step 4: Reemplazar `frontend/src/app/api/settings/users/route.ts`**

```ts
import type { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/users');
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/users');
}

export const dynamic = 'force-dynamic';
```

- [ ] **Step 5: Reemplazar `frontend/src/app/api/settings/users/[id]/route.ts`**

```ts
import type { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

type Contexto = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, contexto: Contexto) {
  const { id } = await contexto.params;
  return proxyToBackend(request, `/users/${id}`);
}

export async function DELETE(request: NextRequest, contexto: Contexto) {
  const { id } = await contexto.params;
  return proxyToBackend(request, `/users/${id}`);
}

export const dynamic = 'force-dynamic';
```

- [ ] **Step 6: Escribir `frontend/src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'motors_session';

/**
 * Solo evita el parpadeo de /admin antes del redirect. **No autoriza nada**: no
 * puede validar la sesión y no debe intentarlo. La decisión real es del backend,
 * que es el único que sabe si el token sirve.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*'] };
```

- [ ] **Step 7: Agregar `BACKEND_URL` a `frontend/.env.example`**

```
# URL interna del backend. SIN el prefijo NEXT_PUBLIC_: con el prefijo,
# la URL del backend termina publicada en el bundle del navegador.
BACKEND_URL=http://localhost:4000
```

Y crear `frontend/.env.local` con la misma línea.

- [ ] **Step 8: Verificar que compila**

Run: `cd frontend && npm run typecheck`
Expected: PASS. Las funciones de usuarios del store quedan sin usar pero siguen exportadas, y un export sin uso no rompe el typecheck: se borran en la Task 10.

- [ ] **Step 9: Commit**

```bash
cd .. && git add frontend && git commit -m "feat(frontend): proxy al backend para auth y usuarios, middleware de /admin"
```

---

## Task 10: Login con Google en el frontend

**Files:**
- Modify: `frontend/src/app/login/LoginView.tsx`, `frontend/src/server/store.ts`, `frontend/src/server/data/crm.ts`
- Delete: `frontend/src/app/registro/`, `frontend/src/app/recuperar-password/`

**Interfaces:**
- Consumes: `/api/auth/google` (Task 9).
- Produces: nada que consuman tareas siguientes.

- [ ] **Step 1: Borrar las paginas que dejan de tener sentido**

```bash
cd frontend
rm -rf src/app/registro src/app/recuperar-password
```

Con Google como unico camino de entrada no hay contrasena que registrar ni que
recuperar. Dejarlas en pie prometeria un flujo que ya no existe.

- [ ] **Step 2: Reescribir `frontend/src/app/login/LoginView.tsx` por completo**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/site/AuthShell';

/** Los codigos los produce el callback del backend. */
const MENSAJES: Record<string, string> = {
  no_invitado: 'Esa cuenta no tiene acceso al panel. Pedile una invitacion a un administrador.',
  email_sin_verificar: 'Tu cuenta de Google no tiene el email verificado.',
  cuenta_en_conflicto: 'Ese email ya esta asociado a otra cuenta de Google.',
  state_invalido: 'No pudimos validar el intento de ingreso. Proba de nuevo.',
  sesion_expirada: 'Tardaste demasiado y el intento vencio. Proba de nuevo.',
  google_rechazo: 'Cancelaste el ingreso con Google.',
  google_fallo: 'No pudimos verificar tu cuenta con Google. Proba de nuevo.',
};

function LoginContent() {
  const params = useSearchParams();
  const [remember, setRemember] = useState(true);

  const codigo = params.get('error');
  const errorMsg = codigo ? (MENSAJES[codigo] ?? 'No pudimos iniciar tu sesion.') : '';

  return (
    <AuthShell>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          margin: '0 0 8px',
          textAlign: 'center',
        }}
      >
        Ingresar
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', margin: '0 0 32px' }}>
        El panel es solo para el equipo de 5848 Motors.
      </p>

      {errorMsg && (
        <div
          role="alert"
          style={{
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: 13,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/*
        Un <a>, no un fetch: el flujo OAuth es una navegacion del navegador. Un
        fetch recibiria el 302 hacia Google y no llevaria a ningun lado.
      */}
      <a
        href={`/api/auth/google${remember ? '?remember=1' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'var(--invert-bg)',
          color: 'var(--invert-ink)',
          padding: 14,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Entrar con Google
      </a>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--ink-strong)',
          marginTop: 14,
        }}
      >
        <input type="checkbox" checked={remember} onChange={() => setRemember((v) => !v)} />
        Recordarme en este dispositivo
      </label>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', margin: '24px 0 0' }}>
        El acceso al panel es por invitacion. Si no podes entrar, pedile a un
        administrador que te sume desde Configuracion.
      </p>
    </AuthShell>
  );
}

/**
 * `useSearchParams` exige un Suspense por encima o `next build` falla al
 * prerenderizar la pagina. Va aca y no en `page.tsx` para que el archivo quede
 * autocontenido.
 */
export function LoginView() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
```

Tres cosas que este archivo resuelve y que es facil romper:

- **`AuthShell` solo acepta `{ children, maxWidth }`.** No tiene props `title` ni
  `subtitle`: el titulo es un `<h1>` que pone cada pantalla.
- **Desaparecen los enlaces a `/registro` y `/recuperar-password`**, que estaban en
  este mismo archivo y ahora apuntarian a paginas borradas.
- **Se van `useToast`, `apiSend`, `INPUT` e `isEmail`** de los imports: no queda nada
  que los use.

- [ ] **Step 3: Sacar los usuarios del store en memoria**

Los usuarios ahora viven en la base del backend. Dejar la copia en memoria garantiza
que dos partes del panel muestren listas distintas.

En `frontend/src/server/store.ts`, cuatro ediciones:

1. Quitar `seedUsers,` de la lista de imports de `@/server/data/crm`.
2. Quitar `PanelUser,` de la lista de imports de `@/types`.
3. Quitar la linea `users: PanelUser[];` de la interfaz `Store`.
4. Quitar la linea `users: seedUsers.map((u) => ({ ...u })),` de la inicializacion.

Y borrar estas tres funciones completas:

```ts
export function listUsers(): PanelUser[] {
  return store().users;
}

export function inviteUser(email: string, role: PanelUser['role']): PanelUser {
  const user: PanelUser = {
    id: nextId('u'),
    name: email.split('@')[0],
    email,
    role,
    status: 'pending',
  };
  store().users.push(user);
  return user;
}

export function removeUser(id: string): boolean {
  const s = store();
  const index = s.users.findIndex((u) => u.id === id);
  if (index === -1) return false;
  s.users.splice(index, 1);
  return true;
}
```

En `frontend/src/server/data/crm.ts`, borrar el export `seedUsers`: despues de lo
anterior no lo usa nadie.

- [ ] **Step 4: Verificar que no quedaron referencias colgando**

Run:
```bash
grep -rn "/registro\|/recuperar-password\|listUsers\|inviteUser\|seedUsers" src
```
Expected: sin resultados. La unica coincidencia aceptable es `removeUser` en
`src/app/admin/configuracion/AdminConfiguracionView.tsx`, que es una funcion local
del componente (hace `DELETE` contra la API) y no tiene ninguna relacion con la del
store.

- [ ] **Step 5: Verificar que compila y construye**

Run: `npm run typecheck && npm run build`
Expected: PASS. La lista de rutas del build no debe incluir `/registro` ni
`/recuperar-password`.

- [ ] **Step 6: Commit**

```bash
cd .. && git add frontend && git commit -m "feat(frontend): login con Google, baja de registro y recuperar-password"
```

---

## Task 11: Sentry en el frontend

**Files:**
- Create: `frontend/sentry.server.config.ts`, `frontend/sentry.client.config.ts`, `frontend/instrumentation.ts`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: nada del backend.
- Produces: nada.

- [ ] **Step 1: Instalar**

```bash
cd frontend
npm install @sentry/nextjs@10.73.0
```

- [ ] **Step 2: Escribir `frontend/sentry.client.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

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
```

- [ ] **Step 3: Escribir `frontend/sentry.server.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      // El proxy reenvía la cookie de sesión: no puede salir del proceso.
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });
}
```

- [ ] **Step 4: Escribir `frontend/instrumentation.ts`**

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
}
```

- [ ] **Step 5: Agregar las variables a `frontend/.env.example`**

```
# Un DSN esta disenado para ser publico: solo permite escribir eventos.
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
```

- [ ] **Step 6: Verificar que construye**

Run: `npm run typecheck && npm run build`
Expected: PASS, sin DSN configurado y sin errores.

- [ ] **Step 7: Commit**

```bash
cd .. && git add frontend && git commit -m "feat(frontend): Sentry sin session replay y con depuracion de cookies"
```

---

## Task 12: Puesta en marcha y verificación end-to-end

**Files:**
- Modify: `README.md`, `backend/README.md`, `PRODUCT.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: nada.

- [ ] **Step 1: Crear las credenciales en Google Cloud Console**

1. Google Cloud Console → **APIs y servicios → Pantalla de consentimiento de OAuth**. Tipo **Externo**, completar nombre de la app y email de soporte.
2. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
3. En **URIs de redireccionamiento autorizados**, agregar exactamente: `http://localhost:3000/api/auth/google/callback`
4. Copiar el ID y el secreto a `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `backend/.env`.

El URI tiene que coincidir **carácter por carácter** con `OAUTH_REDIRECT_URI`. Es el error más frecuente y el mensaje de Google no lo dice claro. Notar que apunta al puerto **3000** (Next), no al 4000: el navegador siempre habla con Next.

- [ ] **Step 2: Sembrar el administrador inicial**

```bash
cd backend
# Poner tu email de Google en BOOTSTRAP_ADMIN_EMAIL dentro de .env
npm run db:up
npx prisma migrate deploy
npm run db:seed
```

Expected: `Administrador inicial listo: <tu email>`.

- [ ] **Step 3: Levantar los dos servicios**

En dos terminales:

```bash
cd backend && npm run dev     # :4000
cd frontend && npm run dev    # :3000
```

- [ ] **Step 4: Verificar el flujo completo a mano**

1. Abrir `http://localhost:3000/admin` → debe redirigir a `/login`.
2. Clic en "Entrar con Google" → pantalla de Google.
3. Elegir la cuenta del `BOOTSTRAP_ADMIN_EMAIL` → vuelve a `/admin`, logueado.
4. `http://localhost:3000/api/auth/me` → devuelve el usuario con `"role": "Administrador"`.
5. En `/admin/configuracion`, invitar un email cualquiera → aparece como **pendiente**.
6. Verificar que quedó en la base, no en memoria:
   ```bash
   docker exec motors-db psql -U motors -d motors -c 'select email, role, status from "User"'
   ```
7. En una ventana de incógnito, intentar entrar con una cuenta de Google **no invitada** → debe volver a `/login?error=no_invitado`.
8. Borrar la cookie `motors_session` en las devtools y recargar `/admin` → vuelve a `/login`.

- [ ] **Step 5: Actualizar `README.md`**

Reemplazar la sección "Puesta en marcha" por una que arranque la base, el backend y el frontend, en ese orden, y documente que hacen falta credenciales de Google en `backend/.env`. Agregar `backend/` a la sección "Estructura".

- [ ] **Step 6: Actualizar `backend/README.md`**

Reemplazar el texto de "todavía sin código" por: cómo levantar la base, correr migraciones, sembrar el admin, correr los tests, y el mapa de `src/`.

- [ ] **Step 7: Actualizar `PRODUCT.md`**

En "Restricciones y deudas confirmadas", la línea **"No hay auth real. El panel es sólo frontend; `/admin` y `/api/admin/*` siguen sin proteger"** ya no es del todo cierta y no puede quedar como está. Reemplazarla por:

```
- **Auth resuelta para el panel.** Ingreso con Google (OIDC), solo por invitación,
  con sesión revocable y roles. Falta: `/api/admin/*` sigue sirviéndose desde Next
  contra el store en memoria y todavía no está protegido; se cubre cuando esos
  endpoints se muden al backend.
```

En "Decisiones de producto abiertas", quitar "modelo de auth y roles reales": ya está decidido.

- [ ] **Step 8: Correr toda la verificación**

Run:
```bash
cd backend && npm test && npm run typecheck
cd ../frontend && npm run typecheck && npm run build
```
Expected: PASS en los cuatro.

- [ ] **Step 9: Commit**

```bash
cd .. && git add . && git commit -m "docs: puesta en marcha del backend y estado real de auth en PRODUCT.md"
```

---

## Notas para quien ejecute

**Si un test de base falla con "table does not exist":** faltan las migraciones en `motors_test`. Correr, desde `backend/`:

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.test | cut -d= -f2-) npx prisma migrate deploy
```

Hay que repetirlo cada vez que se agrega una migración.

**Si `db:up` falla con un error de pipe:** Docker Desktop no está corriendo.

**Si `docker compose down -v` no se lleva la base de tests:** los scripts de `/docker-entrypoint-initdb.d` corren una sola vez, cuando se crea el volumen. Cambiar `init-test-db.sql` no tiene efecto hasta recrear el volumen.

**Nunca poner `NEXT_PUBLIC_` delante de `BACKEND_URL`.** Ese prefijo publica el valor en el bundle del navegador.

**Al agregar rutas nuevas al backend, montarlas siempre detrás de `requireSession`** salvo que sean deliberadamente públicas. Es más fácil abrir una ruta cerrada que darse cuenta de que una abierta nunca lo estuvo.
