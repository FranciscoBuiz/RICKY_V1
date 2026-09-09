# Estado del trabajo — backend de autenticación (OIDC con Google)

Última actualización: 2026-09-09
Rama: `feat/backend-auth-oidc`
Plan: `docs/superpowers/plans/2026-09-07-backend-auth-oidc.md`
Spec: `docs/superpowers/specs/2026-09-07-backend-auth-oidc-design.md`

## Dónde vamos

**Las 12 tasks están terminadas y commiteadas**, incluido el Step 4 de la Task 12: el
ingreso con Google se probó a mano en el navegador y funciona. Los checkboxes del plan
están al día, así que el progreso se lee del plan y no hace falta reconstruirlo del
`git log`.

Lo que sigue es decidir qué hacer con la rama `feat/backend-auth-oidc`.

| Task | Qué es | Estado |
|---|---|---|
| 1 | Andamiaje, Docker, `/health` | ✅ |
| 2 | Prisma: esquema, migración, seed | ✅ |
| 3 | Sentry con depuración de datos sensibles | ✅ |
| 4 | Sesiones opacas con hash y revocación | ✅ |
| 5 | Guards de sesión y rol | ✅ |
| 6 | Cliente OIDC de Google | ✅ |
| 7 | Rutas de autenticación (PKCE, state firmado) | ✅ |
| 8 | Endpoints de usuarios | ✅ |
| 9 | Proxy y middleware en Next | ✅ |
| 10 | Login con Google en el frontend | ✅ |
| 11 | Sentry en el frontend | ✅ |
| 12 | Puesta en marcha y verificación E2E | ✅ |

**Verificación al momento de parar:** backend `npm test` → **62 tests, 9 archivos, todos
pasan**; `npm run typecheck` limpio. Frontend `npm run typecheck` limpio y `npm run build`
compila. Árbol de git limpio.

## Cómo retomar

```bash
# 1. Base de datos (Docker Desktop tiene que estar corriendo)
cd backend
npm run db:up
npx prisma migrate deploy

# 2. Comprobar que no se rompió nada
npm test && npm run typecheck

# 3. Los dos servicios, en terminales separadas
cd backend   && npm run dev    # :4000
cd frontend  && npm run dev    # :3000
```

El volumen de Postgres sobrevive a `db:down`, así que los datos siguen ahí.

## Trampa del entorno que costó una hora

**Nunca dejar dos `next dev` sobre el mismo `frontend/.next`.** Se pisan la compilación:
`app-build-manifest.json` declara `static/css/app/layout.css` pero el archivo no llega a
disco, el `<link>` da 404 y **todas las páginas salen sin estilos**. De regalo, el
callback de Google tira 500 con `Jest worker encountered 2 child process exceptions`.

Pasa fácil porque matar el `npm run dev` no mata al hijo (`next dev`, `tsx watch`): el
segundo servidor avisa `Port 3000 is in use ... using available port 3001`, se va al 3001
y el navegador sigue hablando con el huérfano del 3000. Antes de relanzar, comprobar:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*RICKY_V1*' } | Select-Object ProcessId, CommandLine
Get-NetTCPConnection -LocalPort 3000,4000 -State Listen -ErrorAction SilentlyContinue
```

Lo que sobreviva se mata con `taskkill /PID <pid> /T /F` (el `/T` es el que se lleva el
árbol). Si `.next` ya quedó pisado, hay que borrarlo: recompilar solo no lo repara.

## Configuración

`backend/.env` está **completo**: credenciales de Google, `SESSION_COOKIE_SECRET`,
`BOOTSTRAP_ADMIN_EMAIL` y `SENTRY_DSN` cargados. `.env` y `.env.local` están gitignorados
y no se commitean.

`frontend/.env.local` tiene `BACKEND_URL`. **Le falta el DSN de Sentry del frontend**, que
es un proyecto distinto del backend (plataforma Next.js, no Node):

```
NEXT_PUBLIC_SENTRY_DSN=<DSN del proyecto Next.js>
SENTRY_DSN=<el mismo>
```

Sin eso, Sentry del frontend no se inicializa y ya. No bloquea nada.

## Desvíos del plan que hubo que hacer

Todos ya están corregidos en el plan, para que no vuelvan a aparecer si alguien lo ejecuta
de cero:

- **`Session.ttlMs` pasó de `Int` a `BigInt`** (migración `20260909193838_session_ttl_bigint`).
  El TTL de "recordarme" son 2.592.000.000 ms y un `INTEGER` de Postgres corta en
  2.147.483.647: el login con "recordarme" moría en un 500 (`P2020`). El TTL corto de 12 h
  entraba, que es por qué no se veía antes. Prisma tipa la columna como `bigint` pero el
  adapter de `pg` devuelve un `number`, así que hay un `Number()` en el borde.
- **El init de Sentry del cliente va en `instrumentation-client.ts`**, no en
  `sentry.client.config.ts` como decía el plan. Ese nombre lo levanta el plugin de build de
  Sentry, que sólo corre con `withSentryConfig`, y este proyecto no lo usa: el archivo
  quedaba sin bundlear y Sentry nunca arrancaba en el navegador **sin ningún error que lo
  delatara**. Verificado con `grep -rl sentry .next/static/chunks`.
- **Hay que borrar `.next/types` después de borrar rutas**, o `tsc` falla con `TS2307`
  apuntando a las rutas viejas. Es caché de build, no código.
- **Los conteos de tests del plan estaban viejos** (decía 42 y 53 donde van 51 y 62).
- `npm install @sentry/nextjs@10.73.0` escribe `^10.73.0`; las Global Constraints piden
  versión exacta.

## Deudas conocidas, sin resolver

- **`PATCH /users/:id` revoca las sesiones del afectado siempre**, así que un admin que se
  edite a sí mismo el `status` se desloguea solo. Es un caso raro y arreglarlo es una línea,
  pero se dejó como lo define el plan.
- **`npm audit` en el frontend reporta 3 vulnerabilidades (2 altas, 1 crítica) en
  `next@15.5.4`**, una de ellas de RCE. Son previas a este trabajo. Actualizar Next es una
  decisión aparte porque puede romper cosas.
