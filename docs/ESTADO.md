# Estado del trabajo — backend de autenticación (OIDC con Google)

Última actualización: 2026-09-09
Rama: `feat/backend-auth-oidc`
Plan: `docs/superpowers/plans/2026-09-07-backend-auth-oidc.md`
Spec: `docs/superpowers/specs/2026-09-07-backend-auth-oidc-design.md`

## Dónde vamos

**Tasks 1 a 12 terminadas y commiteadas.** De la Task 12 queda pendiente **un solo
paso, y es de una persona**: el Step 4, la prueba a mano del flujo en el navegador.
Todo lo demás (credenciales, seed, documentación, verificación) está hecho. Los
checkboxes del plan están al día, así que el progreso se lee del plan y no hace falta
reconstruirlo del `git log`.

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
| 12 | Puesta en marcha y verificación E2E | ✅ salvo el Step 4 (prueba a mano) |

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

## Qué falta exactamente (Task 12)

Sólo el **Step 4: probar el flujo a mano en el navegador**, con los dos servicios
levantados. La checklist, tal cual está en el plan:

1. `http://localhost:3000/admin` → redirige a `/login?next=%2Fadmin`. ✅ ya comprobado
   con `curl`.
2. Clic en "Entrar con Google" → pantalla de Google. La URL de autorización ya se arma
   bien (PKCE, `state`, `nonce` y el `redirect_uri` exacto): comprobado con `curl`, lo
   que falta es completar el login real.
3. Elegir la cuenta de `BOOTSTRAP_ADMIN_EMAIL` → vuelve a `/admin`, logueado. El usuario
   sembrado pasa de `PENDING` a `ACTIVE` en ese primer ingreso.
4. `http://localhost:3000/api/auth/me` → devuelve el usuario con `"role": "Administrador"`.
5. En `/admin/configuracion`, invitar un email cualquiera → aparece como **pendiente**.
6. Verificar que quedó en la base:
   `docker exec motors-db psql -U motors -d motors -c 'select email, role, status from "User"'`
7. En incógnito, entrar con una cuenta de Google **no invitada** → vuelve a
   `/login?error=no_invitado`.
8. Borrar la cookie `motors_session` y recargar `/admin` → vuelve a `/login`.

Lo demás está hecho: las credenciales de Google ya están en `backend/.env`, el admin
inicial está sembrado (`buizfrancisco@gmail.com`, hoy `PENDING` hasta el primer ingreso),
la documentación quedó actualizada y las cuatro verificaciones pasan.

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
