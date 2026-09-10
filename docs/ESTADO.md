# Estado del trabajo — despliegue de la demo en el home lab

Última actualización: 2026-09-09
Rama: `feat/despliegue-home-lab` (mergeada a `master`; las dos apuntan al mismo commit)
Plan: `docs/superpowers/plans/2026-09-09-despliegue-home-lab.md`
Spec: `docs/superpowers/specs/2026-09-09-despliegue-home-lab-design.md`

El trabajo anterior — el backend de autenticación con Google, 12 tasks — está terminado
y su estado quedó registrado en el commit `2caf19f`. Lo que sigue describe el trabajo
nuevo.

## Dónde vamos

**La Fase 1 está terminada: `/api/*` ya no sirve costos internos ni datos de contacto sin
sesión.** Ese era el bloqueo real para salir a internet, no el despliegue en sí. Quedan
12 tasks, todas en el repo salvo la verificación final, que ocurre en el Debian.

Los checkboxes del plan están al día: el progreso se lee del plan, no del `git log`.

| Task | Qué es | Estado |
|---|---|---|
| 1 | Runner de tests y helper de sesión | ✅ |
| 2 | Cerrar `/api/admin/*` | ✅ |
| 3 | Cerrar consultas, turnos y configuración | ✅ |
| 4 | El modelo acepta fotos, motos y datos faltantes | ⬜ |
| 5 | Las 45 fotos y los seis vehículos reales | ⬜ |
| 6 | Precios en dólares | ⬜ |
| 7 | La card del catálogo muestra la foto | ⬜ |
| 8 | La galería de la ficha muestra las fotos | ⬜ |
| 9 | El panel muestra la foto y admite margen sin cargar | ⬜ |
| 10 | La semilla del panel, coherente con el catálogo real | ⬜ |
| 11 | Un usuario invitado pendiente en el backend | ⬜ |
| 12 | Imagen del backend | ⬜ |
| 13 | Imagen del frontend | ⬜ |
| 14 | El stack completo | ⬜ |
| 15 | DEPLOY.md y documentación al día | ⬜ |

**Verificación al momento de parar,** corrida sobre el árbol que se mergeó:

- `frontend`: `npm test` → **29 tests, 3 archivos, todos pasan**.
- `frontend`: `npm run typecheck` limpio y `npm run build` compila.
- Árbol de git limpio, sin dev servers huérfanos (nada escuchando en :3000).
- El backend no se tocó en esta fase, así que sus 62 tests siguen como estaban.

## Qué quedó cerrado en la Fase 1

Las 17 rutas de `frontend/src/app/api/` estaban abiertas: `middleware.ts` sólo matchea
`/admin/:path*` y una ruta que empieza con `/api` no entra en ese patrón.

- `frontend/src/lib/session.ts` — helper nuevo. `getSession(request)` reenvía la cookie
  entrante a `GET {BACKEND_URL}/auth/me` y devuelve el usuario o `null`; `sinSesion()`
  devuelve el `401` con la forma `{ error }` que ya consume `frontend/src/lib/api.ts`.
  **Falla cerrado**: si el backend está caído devuelve `null`, porque fallar abierto
  expondría los costos internos justo en el peor momento.
- Guarda como primera línea en los 13 handlers privados: los 6 de `/api/admin/*` y los 7
  de consultas, turnos y configuración.
- Lo público sigue público: los tres `POST` (consulta, turno, vender-mi-auto) y los `GET`
  del catálogo, servicios, disponibilidad y `GET /api/settings`.
- `vitest@4.1.11` en el frontend, con la versión exacta que ya usa el backend.

## Cómo retomar

El plan se está ejecutando con **subagent-driven-development**. El ledger vive en
`.superpowers/sdd/2026-09-09-despliegue-home-lab/progress.md` y es el que manda: tiene
una línea `Task N: complete` por cada task cerrada, los rulings y los minors diferidos.
Ese directorio está gitignoreado, así que existe sólo en esta máquina.

Para seguir:

1. Retomar en la **Task 4**, con BASE = la punta actual de la rama.
2. Los briefs se generan con
   `bash <skill>/scripts/task-brief docs/superpowers/plans/2026-09-09-despliegue-home-lab.md N`.
3. Nada que levantar antes: las Tasks 4 a 10 son todas frontend y no necesitan la base de
   datos. La Task 11 sí — `cd backend && npm run db:up`.

```bash
# Comprobar que nada se rompió antes de seguir
cd frontend && npm test && npm run typecheck
```

## Decisiones que tomé durante la ejecución

Están en el ledger, pero acá quedan para que se puedan revisar y deshacer:

1. **El plan sub-implementaba a su propio spec en los tests de autorización.** El brief de
   la Task 2 no testeaba los handlers de `/api/admin/vehicles/[id]`, y el de la Task 3
   testeaba 3 de las 7 combinaciones privadas. El spec (sección "Fase 1", párrafo
   "Testing") pide una tabla que recorra **todo** el reparto, y cierra con "un guard sin
   test es lo que se cae en silencio en el próximo refactor". Amplié las dos tablas.
   *Si me equivoqué:* sobran nueve tests.
2. **El helper se llama `getSession`, no `requireSession`.** El spec usa el segundo
   nombre, el plan el primero, y así se implementó y así lo consumen las Tasks 2 y 3.
   Mismo comportamiento; el nombre no es contrato con nada externo.
   *Si me equivoqué:* un rename mecánico en tres archivos.
3. **El cast del test de sesión diverge del plan.** `session.test.ts` usa
   `(espia.mock.calls[0] as unknown) as [URL, RequestInit]` en vez del cast directo que
   dictaba el plan, porque `vi.fn(async () => ...)` infiere un mock de cero argumentos y
   el cast directo no compila con TS strict. Acá el error lo tiene el plan.

## Cosas menores, anotadas y no arregladas

- `vitest run` imprime un warning de Vite: `vitest.config.ts` usa sintaxis ESM en un
  archivo cargado como CommonJS. No afecta nada, pero **la salida de tests no es
  impecable**. Se arregla renombrando a `vitest.config.mts`; ojo que el `.dockerignore`
  de la Task 13 nombra el archivo, así que hay que cambiarlo en los dos lados.
- Los comentarios de las guardas describen qué devuelve el endpoint en vez de por qué
  existe la guarda. Es el texto literal del plan, no una elección de quien implementó.
- El cast del import dinámico en `reparto-publico.test.ts` tipa cualquier módulo como
  `(r, s?) => Promise<Response>`, más laxo de lo necesario.

## Lo que va a hacer falta de tu lado para la Fase 4

Nada de esto bloquea las Tasks 4 a 13, que son todas trabajo en el repo:

1. El Debian del lab con `docker` y `tailscaled` corriendo, y **HTTPS y Funnel
   habilitados** en la consola del tailnet.
2. Un **repositorio privado en GitHub**. Hoy el proyecto vive en un solo disco y no tiene
   remoto configurado; el primer paso del `DEPLOY.md` es clonarlo en el servidor.
3. Acceso a **Google Cloud Console** para dar de alta el redirect URI de la URL de Funnel.
   Se **agrega**, no reemplaza al de localhost. Si se olvida, el síntoma es
   `redirect_uri_mismatch` de Google, no un error de la app.
4. El **mail de Google del dueño** para `BOOTSTRAP_ADMIN_EMAIL`, y opcionalmente un
   segundo para `SEED_INVITED_EMAIL`.

La prueba local del stack (Task 14, Step 4) necesita un `.env` con las credenciales de
Google: se usan las de desarrollo que ya están en `backend/.env`, con
`APP_ORIGIN=http://localhost:3000`, y ese `.env` se borra al terminar. Nunca se commitea.

## Riesgos que el plan ya marcó, para no re-descubrirlos

- **El filtro `priceMax` con precios en USD.** Los escalones actuales están pensados para
  millones de pesos; con dólares dejan los seis vehículos del mismo lado. La Task 6 los
  reemplaza, pero es el punto más probable de retoque visual.
- **Prisma en `node:22-slim`.** Si `migrate deploy` falla por OpenSSL, la alternativa es
  `node:22-bookworm`. Se ve en el primer build local, no en el servidor.
- **Corte de luz o de internet en el lab = la demo muere.** Conviene avisarle al dueño
  antes de mandarle el link, no después.

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

## Deudas conocidas, sin resolver

- **El store del panel sigue en memoria.** Lo que el dueño cargue desde el panel se pierde
  en cada reinicio del contenedor. Está fuera del alcance de este plan a propósito: es su
  propio ciclo.
- **No se pueden subir fotos desde el panel.** Las 45 de la semilla se versionan en el
  repo; un vehículo nuevo va a mostrar el marcador de bandas.
- **`PATCH /users/:id` revoca las sesiones del afectado siempre**, así que un admin que se
  edite a sí mismo el `status` se desloguea solo.
- **`npm audit` en el frontend reporta 3 vulnerabilidades (2 altas, 1 crítica) en
  `next@15.5.4`**, una de ellas de RCE. Son previas a este trabajo. Actualizar Next es una
  decisión aparte porque puede romper cosas.
