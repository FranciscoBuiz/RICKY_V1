# Backend — 5848 Motors

Servicio Fastify que autentica al equipo con Google (OIDC), emite sesiones
propias revocables y administra los usuarios del panel. Corre en `:4000` y **el
navegador nunca lo toca**: Next hace de BFF y le reenvía `/api/auth/*` y
`/api/settings/users*`.

**Stack:** Node 22 · TypeScript · Fastify 5 · Prisma 7 · PostgreSQL 17 (Docker) ·
openid-client 6 · zod 4 · Vitest · Sentry.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # y completar (ver abajo)
npm run db:up             # Postgres 17 en :5432, con Docker Desktop corriendo
npx prisma migrate deploy
npm run db:seed           # crea el admin de BOOTSTRAP_ADMIN_EMAIL
npm run dev               # http://localhost:4000
```

`npm run db:down` apaga la base **sin borrar el volumen**, así que los datos
sobreviven. Para empezar de cero: `npm run db:reset` (baja, borra el volumen,
migra y siembra).

### Credenciales de Google

En Google Cloud Console → **APIs y servicios**:

1. **Pantalla de consentimiento de OAuth**, tipo *Externo*, con nombre de la app
   y email de soporte. Si queda en modo *Prueba*, agregar la propia cuenta en
   **Usuarios de prueba** o el ingreso corta con `access_denied`.
2. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación
   web**, con:
   - Orígenes autorizados de JavaScript: `http://localhost:3000`
   - URIs de redireccionamiento autorizados:
     `http://localhost:3000/api/auth/google/callback`
3. Copiar el ID y el secreto a `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

El URI de redireccionamiento apunta al **3000 (Next), no al 4000**, y tiene que
coincidir **carácter por carácter** con `OAUTH_REDIRECT_URI`, sin barra final.
Es el error más común y el mensaje de Google no lo aclara.

### Variables de entorno

`.env` (gitignoreado; la plantilla es `.env.example`). Los tests leen las
mismas variables de `.env.test`, donde `DATABASE_URL` ya apunta a `motors_test`:

| Variable | Para qué |
| --- | --- |
| `POSTGRES_USER` · `POSTGRES_PASSWORD` · `POSTGRES_DB` · `DB_PORT` | Los lee docker-compose al crear el contenedor |
| `DATABASE_URL` · `DATABASE_URL_TEST` | Cadenas de conexión a `motors` y `motors_test` |
| `NODE_ENV` · `PORT` · `APP_ORIGIN` | Entorno, puerto y origen del frontend al que se vuelve |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `OAUTH_REDIRECT_URI` | Credenciales de Google |
| `SESSION_COOKIE_SECRET` | Firma la cookie de estado del flujo OAuth. Mínimo 32 caracteres |
| `BOOTSTRAP_ADMIN_EMAIL` | Primer administrador; sólo lo usa el seed |
| `SENTRY_DSN` · `SENTRY_ENVIRONMENT` · `SENTRY_TRACES_SAMPLE_RATE` | Observabilidad. Sin DSN, Sentry no se inicializa |

`src/env.ts` las valida con zod al arrancar: si falta una, el proceso no levanta.

## Tests

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
```

Los tests corren contra `motors_test`, una base aparte que el contenedor crea al
inicializar el volumen (`docker/init-test-db.sql`). Cada archivo limpia sus
tablas, así que se pueden correr en cualquier orden. El flujo entero de OAuth se
ejercita con un doble del cliente OIDC: **no se toca la red**.

Si un test falla con *"table does not exist"*, a `motors_test` le faltan las
migraciones:

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.test | cut -d= -f2-) npx prisma migrate deploy
```

Hay que repetirlo cada vez que se agrega una migración.

## Endpoints

| Método y ruta | Acceso | Qué hace |
| --- | --- | --- |
| `GET /health` | público | `{ ok: true }` |
| `GET /auth/google` | público | Arranca el flujo: PKCE, `state` firmado y redirect a Google |
| `GET /auth/google/callback` | público | Canjea el `code`, crea la sesión y vuelve al panel |
| `GET /auth/me` | sesión | El usuario de la sesión actual |
| `POST /auth/logout` | sesión | Revoca la sesión y borra la cookie |
| `GET /users` | admin | Lista de usuarios del panel |
| `POST /users` | admin | Invita por email (queda `pendiente`) |
| `PATCH /users/:id` | admin | Cambia rol o estado |
| `DELETE /users/:id` | admin | Da de baja |

Todos los mensajes de error salen en español con la forma `{ "error": "..." }`,
porque el frontend los muestra tal cual.

**Al agregar rutas nuevas, montarlas detrás de `requireSession`** salvo que sean
deliberadamente públicas: es más fácil abrir una ruta cerrada que descubrir que
una abierta nunca lo estuvo.

## Mapa de `src/`

| Archivo | Responsabilidad |
| --- | --- |
| `env.ts` | Valida la configuración con zod. No sabe de HTTP ni de base |
| `load-env.ts` | Carga `.env` con `process.loadEnvFile` (nada de dotenv) |
| `app.ts` | Arma la instancia Fastify y monta las rutas. No escucha el puerto |
| `main.ts` | Carga el entorno, inicializa Sentry y escucha. El único con efectos de arranque |
| `http/errors.ts` | La forma `{ error }` y el helper de respuesta |
| `db/prisma.ts` | Cliente Prisma singleton, sobre el adapter de `pg` |
| `observability/sentry.ts` | `init` + depuración de datos sensibles, como función pura testeable |
| `auth/session.ts` | Crear / resolver / revocar sesión. **No sabe de HTTP** |
| `auth/guard.ts` | `preHandler` de Fastify: traduce sesión a `request.user` |
| `auth/oidc.ts` | Envuelve openid-client detrás de una interfaz inyectable |
| `auth/routes.ts` | `/auth/*`. El único que sabe de cookies de OAuth |
| `users/repo.ts` | Consultas de usuarios. No sabe de HTTP |
| `users/roles.ts` | Traducción de roles al contrato del frontend |
| `users/routes.ts` | `/users/*`, todo detrás del guard de administrador |
| `generated/prisma/` | Cliente que genera Prisma. No se edita a mano |

Cada módulo depende hacia adentro y nada hacia afuera: `session.ts` no importa
nada de HTTP, `oidc.ts` no sabe que existen las sesiones y `guard.ts` no sabe que
existe Google. Por eso el flujo entero se testea con un doble y sin red.

## Cómo funciona la sesión

Google se usa **sólo para identificar**: no se guarda ninguno de sus tokens. Lo
que viaja al navegador es un token opaco en la cookie `httpOnly`
`motors_session`, del que en la base vive únicamente el **SHA-256**. Por eso una
sesión se puede revocar (y por eso una filtración de la base no la deja usable).

El ingreso es **sólo por invitación**: si el email que devuelve Google no existe
en `User`, el flujo vuelve a `/login?error=no_invitado`.

## Deudas conocidas

- `PATCH /users/:id` revoca siempre las sesiones del usuario afectado, así que un
  admin que se edite el propio `status` se desloguea solo.
- El resto del panel (`/api/admin/*`) sigue en Next contra el store en memoria y
  todavía no está protegido.
