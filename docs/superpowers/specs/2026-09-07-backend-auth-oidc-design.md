# Backend de autenticación — OIDC con Google (etapa 1)

**Fecha:** 2026-09-07
**Estado:** aprobado, pendiente de plan de implementación
**Alcance:** primera etapa del backend de 5848 Motors

## Problema

El panel `/admin` y los endpoints `/api/admin/*` no tienen ninguna protección: son
frontend solo. Las rutas `api/auth/login`, `register` y `recover` validan el formato
de las credenciales y responden como lo haría un backend, pero no emiten sesión ni
persisten nada. Cualquiera que conozca la URL opera el panel.

Además, todos los datos viven en un store en memoria (`frontend/src/server/store.ts`)
que se reinicia con el proceso.

Esta etapa resuelve **solo la identidad**: quién sos, si podés entrar, y qué podés
hacer. La migración del dominio (vehículos, leads, turnos, settings) es la etapa 2 y
tiene su propio spec.

## Alcance

**Entra:**

- Servicio Node + TypeScript nuevo en `backend/`.
- PostgreSQL con Prisma: esquema, migraciones y seed.
- Login con Google vía OpenID Connect (Authorization Code + PKCE).
- Sesiones opacas persistidas, con revocación.
- Roles y guards de autorización.
- Endpoints de usuarios e invitaciones (`/users`), que hoy viven en el store en memoria.
- Proxy en Next hacia el backend para `/api/auth/*` y `/api/settings/users*`.
- Sentry en backend y frontend, con depuración de datos sensibles.
- Eliminación de `/registro` y `/recuperar-password` en el frontend.

**Queda afuera:**

- Migrar vehículos, leads, turnos, sell-requests y settings — etapa 2.
- Proteger `/api/admin/*`, que sigue sirviéndose desde Next contra el store en
  memoria. Se protege cuando esos endpoints se muden al backend, en la etapa 2.
- Tokens bearer para clientes no-navegador (app móvil).
- Recuperación de contraseña: deja de existir, Google es el único camino de entrada.
- Storage de imágenes, integración de WhatsApp, envío de mails.
- **PostHog.** Mide conversión del sitio público — consultas, turnos, clics a
  WhatsApp — y en esta etapa no existe nada de eso: el login del panel no es un
  embudo. Entra cuando midamos el sitio público, con su propia decisión sobre
  consentimiento y Ley 25.326.

### Dos ajustes de alcance respecto del diseño conversado

Aparecieron al redactar el spec y son necesarios para que la rebanada funcione:

1. **Los endpoints de usuarios entran en la etapa 1.** El login es solo por
   invitación, así que la invitación tiene que quedar en la base del backend. Si
   `/api/settings/users` sigue escribiendo en el store en memoria, nadie queda
   invitado donde el login lo busca y no puede entrar nadie.
2. **Hace falta un seed del primer administrador.** Nadie puede invitar al primero.
   `prisma/seed.ts` crea un `ADMIN` `PENDING` a partir de `BOOTSTRAP_ADMIN_EMAIL`.

## Decisiones y por qué

| Decisión | Razón |
| --- | --- |
| OIDC, no OAuth 2.0 "pelado" | OAuth autoriza acceso a recursos; no dice quién es el usuario. La identidad la da la capa OIDC y su ID token. |
| `openid-client` | Biblioteca certificada como Relying Party. Valida firma contra las JWKS de Google, `iss`, `aud`, `exp` y `nonce`. Esa validación a mano es donde aparecen los agujeros. |
| Sesión opaca en base, no JWT | Un JWT no se revoca: alguien que sale del equipo sigue entrando hasta que expire. Con `revokedAt` se corta en el próximo request. |
| Se guarda el hash del token | La cookie lleva 256 bits aleatorios; la base guarda su SHA-256. Un dump de la base no alcanza para fabricar una cookie válida. |
| Next como BFF, mismo origen | Sin CORS ni cookies cross-site. El token nunca es legible desde JS. `frontend/src/lib/api.ts` no se toca. |
| No se guardan tokens de Google | Solo se piden los scopes `openid email profile`. Identificado el usuario, la sesión es nuestra. Menos secretos ajenos almacenados. |
| Solo por invitación | No hay auto-registro: una cuenta de Google cualquiera no entra al panel de la agencia. |
| Fastify | Tipado TS de primera, `preHandler` es exactamente la forma de un guard, y `app.inject()` testea sin abrir puerto. |

## Arquitectura

```
backend/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts                 admin inicial desde BOOTSTRAP_ADMIN_EMAIL
├─ src/
│  ├─ main.ts                 arranca y escucha
│  ├─ app.ts                  construye la app sin escuchar (testeable)
│  ├─ env.ts                  valida env vars con zod; sin ellas no arranca
│  ├─ db/prisma.ts            cliente singleton
│  ├─ auth/
│  │  ├─ oidc.ts              cliente OIDC de Google
│  │  ├─ session.ts           crear / resolver / revocar sesión
│  │  ├─ guard.ts             requireSession, requireRole
│  │  └─ routes.ts            /auth/*
│  ├─ users/
│  │  ├─ repo.ts              acceso a datos de usuarios
│  │  └─ routes.ts            /users/*
│  ├─ http/errors.ts          forma { error: string }
│  └─ observability/sentry.ts  init + depuración de datos sensibles
├─ docker-compose.yml         Postgres local
├─ docker/init-test-db.sql    crea la base de tests en el primer arranque
├─ package.json
├─ tsconfig.json
└─ .env.example
```

Cada unidad tiene una responsabilidad y un límite claro: `oidc.ts` no sabe de
sesiones, `session.ts` no sabe de HTTP, `guard.ts` no sabe de Google. Eso es lo que
permite testear el flujo entero con un doble del cliente OIDC.

## Base de datos local (Docker)

Postgres corre en un contenedor definido en `backend/docker-compose.yml`. Nadie
instala Postgres en su máquina: `npm run db:up` y ya.

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

Cuatro decisiones dentro de esto:

- **Volumen con nombre.** Sin él, `docker compose down` se lleva la base entera. Con
  él, los datos sobreviven a reiniciar el contenedor y se borran solo con
  `docker compose down -v`, que es explícito.
- **`DB_PORT` es configurable.** Si ya tenés algo escuchando en 5432, se cambia el
  puerto del host sin tocar nada más.
- **La base de tests se crea en el arranque.** `docker/init-test-db.sql` hace un
  `CREATE DATABASE motors_test` en el mismo contenedor. Los scripts de
  `/docker-entrypoint-initdb.d` corren **solo la primera vez** que se crea el volumen:
  si agregamos algo ahí después, hay que recrear el volumen para que tome efecto.
- **`healthcheck`.** Prisma falla feo si corre las migraciones contra un Postgres que
  todavía está arrancando. El healthcheck deja esperar a que esté listo de verdad.

Scripts de npm en el backend: `db:up` (levanta y espera el healthcheck), `db:down`,
`db:logs`, `db:reset` (`down -v` + `up` + `migrate` + `seed`).

## Modelo de datos

```prisma
enum Role   { ADMIN EDITOR VIEWER }
enum Status { PENDING ACTIVE }

model User {
  id          String    @id @default(cuid())
  email       String    @unique          // en minúsculas; es la identidad
  name        String
  role        Role
  status      Status    @default(PENDING)
  googleSub   String?   @unique          // se fija en el primer login
  invitedAt   DateTime  @default(now())
  lastLoginAt DateTime?
  sessions    Session[]
}

model Session {
  id        String    @id @default(cuid())
  tokenHash String    @unique            // SHA-256 del valor de la cookie
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
  expiresAt DateTime
  revokedAt DateTime?
  userAgent String?
  ip        String?

  @@index([userId])
}
```

`state` y `code_verifier` del flujo OIDC **no** van a la base: viajan en una cookie
firmada de vida corta (10 minutos), que es donde corresponde que estén.

### Traducción de roles

El frontend ya habla en etiquetas (`Administrador` / `Editor` / `Solo lectura`) y el
`POST` de invitación ya acepta `admin | editor | viewer`. La traducción vive en el
borde HTTP del backend, así que **el contrato que ve el frontend no cambia**.

| Enum | Etiqueta de la API | Clave de invitación |
| --- | --- | --- |
| `ADMIN` | `Administrador` | `admin` |
| `EDITOR` | `Editor` | `editor` |
| `VIEWER` | `Solo lectura` | `viewer` |

## Flujo de autenticación

1. Visita a `/admin` sin cookie → el `middleware` de Next redirige a `/login`.
2. Botón "Entrar con Google" → `GET /api/auth/google` → proxy → backend.
3. El backend genera `state`, `nonce` y `code_verifier` (PKCE, método S256), los
   guarda en una cookie firmada de 10 minutos, y responde `302` hacia Google.
4. Google vuelve a `GET /api/auth/google/callback?code&state`.
5. El backend valida `state` contra la cookie, canjea el `code` usando el
   `code_verifier`, y valida el ID token (firma contra JWKS, `iss`, `aud`, `exp`,
   `nonce`). Exige `email_verified: true`.
6. Busca el usuario por email normalizado a minúsculas:
   - **No existe** → `302` a `/login?error=no_invitado`. No hay auto-registro.
   - Existe, `status = PENDING` → pasa a `ACTIVE` y se le fija el `googleSub`.
   - Existe con un `googleSub` distinto al del token → `302` a
     `/login?error=cuenta_en_conflicto`. Es alguien reclamando un email ajeno.
7. Crea la sesión, setea la cookie y responde `302` a `/admin`.
8. La cookie de `state` se borra en el mismo response.

### Cookie de sesión

`httpOnly`, `SameSite=Lax`, `Secure` cuando `NODE_ENV=production`, `Path=/`.
`SameSite=Lax` es obligatorio y no `Strict`: la vuelta desde Google es una
navegación cross-site, y con `Strict` el navegador no manda la cookie y el usuario
aterriza en `/admin` deslogueado.

Duración: 12 horas por defecto, 30 días si el usuario marcó "recordarme". Ese flag
se guarda en la misma cookie firmada que `state`, `nonce` y `code_verifier`, y se lee
en el callback. No viaja por la query de Google: así nadie lo puede alterar en el
camino de ida. La expiración se
renueva de forma deslizante, con **como mucho una escritura por hora**, para no
hacer un `UPDATE` en cada request.

### Logout

`POST /api/auth/logout` marca `revokedAt` y borra la cookie. Responde `204` incluso
si no había sesión: un logout es idempotente y no es un canal para averiguar si una
sesión existía.

## Autorización

- `requireSession`: lee la cookie, busca por hash, verifica que no esté expirada ni
  revocada, carga el usuario y lo deja en `request.user`. Si el usuario pasó a
  `PENDING` o fue borrado, la sesión no sirve.
- `requireRole(...roles)`: `403` si el rol no alcanza.

| Rol | Puede |
| --- | --- |
| `ADMIN` | Todo, incluidos usuarios y configuración. |
| `EDITOR` | Lee y escribe el dominio; **no** toca usuarios ni configuración. |
| `VIEWER` | Solo `GET`. |

En la etapa 1 el único consumidor de `requireRole` es `/users`, que exige `ADMIN`.
`EDITOR` y `VIEWER` quedan definidos y testeados, pero no gobiernan ningún endpoint
hasta que el dominio se mude al backend en la etapa 2. Se definen ahora porque el
frontend ya invita gente con esos roles y la base tiene que poder guardarlos.

El `middleware` de Next mira únicamente si la cookie **existe**, para evitar el
parpadeo de `/admin` antes del redirect. No autoriza nada: no puede validar la
sesión y no debe intentarlo. La decisión real es siempre del backend.

## Contrato HTTP

Rutas del backend, expuestas al navegador bajo `/api/*` por el proxy de Next.

| Método | Ruta | Auth | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/auth/google?remember=1` | — | `302` a Google |
| `GET` | `/auth/google/callback` | — | `302` a `/admin` o `/login?error=...` |
| `POST` | `/auth/logout` | — | `204` |
| `GET` | `/auth/me` | sesión | `200 { user }` · `401 { error }` |
| `GET` | `/users` | `ADMIN` | `200 { users: PanelUser[] }` |
| `POST` | `/users` | `ADMIN` | `201 { user }` · `409` si el email ya existe |
| `PATCH` | `/users/:id` | `ADMIN` | `200 { user }` — cambia `role` o `status` |
| `DELETE` | `/users/:id` | `ADMIN` | `204` — el `onDelete: Cascade` se lleva sus sesiones |
| `GET` | `/health` | — | `200 { ok: true }` |

`PanelUser` mantiene exactamente la forma que ya declara
`frontend/src/types/index.ts`: `{ id, name, email, role, status }`.

Un `ADMIN` no puede quitarse a sí mismo el rol ni borrarse: `409`. Es la forma
barata de no quedarse sin ningún administrador en el sistema.

### Errores

Forma `{ error: string }` en español, igual que las rutas actuales de Next, para que
`ErrorState` y el `parse()` de `lib/api.ts` sigan funcionando sin cambios.

`400` payload inválido · `401` sin sesión o sesión inválida · `403` rol insuficiente
· `404` recurso inexistente · `409` conflicto de estado.

## Cambios en el frontend

| Archivo | Cambio |
| --- | --- |
| `src/app/api/auth/login/`, `register/`, `recover/` | Se borran. |
| `src/app/api/auth/[...path]/route.ts` | Nuevo. Proxy a `BACKEND_URL`, reenvía cookies en ambos sentidos y devuelve los `302` al navegador en vez de seguirlos (`redirect: 'manual'`). |
| `src/app/api/settings/users/route.ts` y `[id]/route.ts` | Pasan a proxy; dejan de usar el store en memoria. |
| `src/app/login/LoginView.tsx` | El formulario de email y contraseña se reemplaza por el botón "Entrar con Google". Muestra el mensaje que corresponda según `?error=`. |
| `src/app/registro/`, `src/app/recuperar-password/` | Se borran, junto con los enlaces que las apuntan. |
| `src/middleware.ts` | Nuevo. Protege `/admin/:path*` por presencia de cookie. |
| `src/server/store.ts` | Se le sacan `listUsers` e `inviteUser` y el seed de usuarios. |

El resto del frontend no se toca. `lib/api.ts` sigue igual porque las rutas siguen
siendo relativas y del mismo origen.

## Observabilidad (Sentry)

`@sentry/node` en el backend, `@sentry/nextjs` en el frontend. Errores y trazas.

**Sin DSN, Sentry no se inicializa.** En desarrollo la variable está vacía y no sale
nada hacia afuera; no hay un modo "silencioso" que igual conecte. Esto vale como
regla: nadie debería tener que acordarse de apagarlo.

### Depuración de datos sensibles

Un servicio de autenticación es el peor lugar posible para mandar payloads crudos a
un tercero. La configuración por defecto de Sentry **no** alcanza, así que va un
`beforeSend` propio que borra, antes de cualquier envío:

- La cookie de sesión y los headers `cookie` y `authorization`.
- Los parámetros `code`, `state`, `id_token` y `access_token` de cualquier URL. **El
  `code` del callback de OAuth es una credencial**: en un stack trace del callback
  viaja dentro de la URL del request, y quien lo lea antes de que expire puede
  canjearlo.
- El cuerpo de los requests a `/auth/*`.

Además: `sendDefaultPii: false`, y del usuario logueado se adjunta **solo `id` y
`role`**, nunca email ni nombre. Para depurar un error de tres personas del equipo,
el `id` alcanza.

`tracesSampleRate` arranca en `0.1`. El 100% de las trazas quema la cuota gratuita en
días y no aporta nada con este volumen.

Esto se testea, no se confía: hay un test que arma un evento con cookie, `code` y
`Authorization`, lo pasa por el `beforeSend` y verifica que los tres salieron.

## Configuración

**`backend/.env`**

| Variable | Para qué |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Las lee `docker-compose.yml` al crear el contenedor |
| `DB_PORT` | Puerto del host, por defecto `5432` |
| `DATABASE_URL` | Postgres de desarrollo; apunta al contenedor |
| `DATABASE_URL_TEST` | La base `motors_test` del mismo contenedor |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales OAuth de Google Cloud Console |
| `OAUTH_REDIRECT_URI` | Debe coincidir **exactamente** con la registrada en Google |
| `SESSION_COOKIE_SECRET` | Firma la cookie de `state`; mínimo 32 bytes |
| `APP_ORIGIN` | A dónde vuelve el usuario después del login |
| `PORT` | Por defecto `4000` |
| `BOOTSTRAP_ADMIN_EMAIL` | Solo lo usa el seed |
| `SENTRY_DSN` | Vacío en desarrollo: sin DSN no se inicializa |
| `SENTRY_ENVIRONMENT` | `development` · `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | Por defecto `0.1` |

**`frontend/.env.local`**: `BACKEND_URL` — server-side, **sin** `NEXT_PUBLIC_`. Si
lleva ese prefijo, la URL interna del backend termina publicada en el bundle. Y
`NEXT_PUBLIC_SENTRY_DSN`, que en cambio **sí** lleva el prefijo: un DSN está diseñado
para ser público, solo permite escribir eventos.

`env.ts` las valida con zod al arrancar. Un secreto faltante mata el proceso al
inicio, no en el primer login de un usuario real.

## Testing

TDD con Vitest y `app.inject()`. Google no se llama nunca en los tests: se inyecta un
doble del cliente OIDC. Los tests corren contra `motors_test`, la segunda base del
mismo contenedor, apuntada por `DATABASE_URL_TEST`. Se trunca entre tests, no se
recrea: recrear el esquema en cada test hace que la suite tarde minutos en vez de
segundos.

Casos que definen el trabajo:

**Arranque** — falta una env var → el proceso no arranca.

**Callback** — `state` ausente · `state` alterado · cookie de `state` vencida ·
`email_verified: false` · email no invitado → `302` a `/login?error=no_invitado` y
**no** crea sesión · usuario `PENDING` se activa y se le fija el `googleSub` · usuario
`ACTIVE` con `googleSub` distinto → `302` a `/login?error=cuenta_en_conflicto` · login
exitoso crea sesión y setea la cookie con los flags correctos.

El callback es una navegación del navegador, no una llamada de API: **todos sus
fracasos son `302` con un `error` en la query**, nunca un JSON de error. Un `403`
ahí le mostraría al usuario una pantalla en blanco.

**Sesión** — sin cookie → `401` · cookie con formato válido pero inexistente → `401`
· sesión expirada → `401` · sesión revocada → `401` · usuario borrado → `401` ·
la renovación deslizante no escribe dos veces dentro de la misma hora.

**Roles** — `VIEWER` haciendo `POST` → `403` · `EDITOR` tocando `/users` → `403` ·
`ADMIN` pasa.

**Usuarios** — invitar crea `PENDING` · invitar un email repetido → `409` · borrar a
alguien invalida su sesión abierta · un `ADMIN` no puede degradarse ni borrarse.

**Logout** — revoca de verdad: el siguiente request con la misma cookie da `401`.

**Sentry** — sin DSN no se inicializa · el `beforeSend` borra la cookie de sesión, el
`code` de la URL y el header `Authorization`.

## Riesgos y cosas a verificar durante la implementación

- **`openid-client` v6 cambió a una API funcional** respecto de la v5. Hay que leer la
  versión que quede instalada antes de escribir contra ella, no asumir la API vieja.
- **El `OAUTH_REDIRECT_URI` tiene que coincidir carácter por carácter** con lo
  registrado en Google Cloud Console. Es el error más común y el mensaje de Google no
  ayuda mucho.
- **El proxy de Next no debe seguir los redirects.** Con el `fetch` por defecto,
  `redirect: 'follow'` hace que el servidor siga al redirect de Google y el navegador
  nunca reciba el `302`. Va `redirect: 'manual'`.
- **Docker Desktop tiene que estar corriendo** antes de cualquier comando de base.
  En Windows necesita WSL2 habilitado. Un `db:up` con Docker apagado da un error de
  pipe que no dice nada útil.
- **Los scripts de `initdb` corren una sola vez**, cuando se crea el volumen. Si
  `init-test-db.sql` cambia, hay que `docker compose down -v` para que se aplique.
