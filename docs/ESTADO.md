# Estado del trabajo — despliegue de la demo en el home lab

Última actualización: 2026-09-21
Rama: `master` (`feat/roles-en-el-panel` y `feat/despliegue-home-lab` se mergearon; todo
el trabajo vive en `master`)
Plan y spec (ronda del home lab): `docs/superpowers/plans/2026-09-09-despliegue-home-lab.md`
y `docs/superpowers/specs/2026-09-09-despliegue-home-lab-design.md`. La ronda de roles no
tiene plan ni spec: fue un cambio acotado, diseñado en el chat y aprobado ahí.

## Dónde estamos

**Las tres rondas de trabajo están terminadas.**

- El backend de autenticación con Google (12 tasks, plan anterior) está terminado; su
  estado quedó registrado en el commit `2caf19f`.
- Este trabajo — cerrar `/api/*`, cargar los vehículos y fotos reales, y empaquetar el
  stack para el home lab (15 tasks, este plan) — está **terminado en el repo**. Las 15
  tasks del plan están marcadas hechas.
- Los **roles del panel** (esta ronda, tres commits, ya en `master`) están
  aplicados: las rutas los exigen, los costos internos dejan de viajar al rol que sólo
  mira, y el panel no ofrece controles que terminarían en 403. Detalle abajo.

Lo único que queda **no** ocurre en el repo: es la puesta en marcha real en el Debian del
lab, descrita en `DEPLOY.md`, más cuatro cosas que tiene que proveer el dueño del lab
(abajo).

| Task | Qué es | Estado |
|---|---|---|
| 1 | Runner de tests y helper de sesión | ✅ |
| 2 | Cerrar `/api/admin/*` | ✅ |
| 3 | Cerrar consultas, turnos y configuración | ✅ |
| 4 | El modelo acepta fotos, motos y datos faltantes | ✅ |
| 5 | Las 45 fotos y los seis vehículos reales | ✅ |
| 6 | Precios en dólares | ✅ |
| 7 | La card del catálogo muestra la foto | ✅ |
| 8 | La galería de la ficha muestra las fotos | ✅ |
| 9 | El panel muestra la foto y admite margen sin cargar | ✅ |
| 10 | La semilla del panel, coherente con el catálogo real | ✅ |
| 11 | Un usuario invitado pendiente en el backend | ✅ |
| 12 | Imagen del backend | ✅ |
| 13 | Imagen del frontend | ✅ |
| 14 | El stack completo | ✅ |
| 15 | DEPLOY.md y documentación al día | ✅ |

**Verificación de la ronda del home lab**, corrida sobre la punta de esa rama:

- `backend`: `npm test` → **64 tests, 9 archivos, todos pasan**; `npm run typecheck`
  limpio.
- `frontend`: `npm test` → **56 tests, 7 archivos, todos pasan**; `npm run typecheck`
  limpio; `npm run build` compila (build standalone, 33 rutas).
- Árbol de git limpio después de cada commit, sin dev servers huérfanos.

## Qué se hizo

**Fase 1 — Autorización de `/api/*`.** Las 17 rutas de `frontend/src/app/api/` estaban
abiertas: `middleware.ts` sólo matchea `/admin/:path*` y una ruta que empieza con `/api`
no entra en ese patrón. Se agregó `frontend/src/lib/session.ts` (`getSession(request)`
reenvía la cookie entrante a `GET {BACKEND_URL}/auth/me` y falla cerrado si el backend
está caído) y una guarda como primera línea en los 13 handlers privados. Lo público
sigue público: los tres `POST` de contacto/turno/vender-mi-auto y los `GET` de catálogo,
servicios, disponibilidad y `GET /api/settings`.

**Fase 2 — Vehículos reales y fotos.** El modelo `Vehicle` ganó `images: VehicleImage[]`
y pasó a aceptar motos y campos opcionales (`engine`, `traction`, `doors`,
`description`) cuando no hay dato real. Se cargaron los seis vehículos reales de la
agencia con sus 45 fotos (`frontend/public/vehiculos/`), precios en USD, y el filtro
`priceMax` se rehizo para esos rangos. La card del catálogo, la galería de la ficha y la
tabla del panel muestran la primera imagen (o la galería completa) cuando `images` no
está vacío, y conservan el marcador de bandas diagonales cuando está vacío — que es lo
que va a mostrar cualquier vehículo nuevo cargado desde el panel, porque no hay forma de
subir fotos.

**Fase 3 — Semilla con todos los estados.** El panel muestra cada estado posible de
`Lead`, `Appointment` y `ActionAlertType` en la semilla de demostración. Los seis
vehículos reales quedan todos en `available` a propósito (Decisión 8 del spec): ninguno
se marca `reserved` o `sold` de mentira en el sitio público. El backend agrega un
segundo usuario invitado que queda `PENDING`, además del admin de bootstrap que queda
`ACTIVE` en su primer login.

**Fase 4 — Empaquetado y despliegue.** `backend/Dockerfile` (`node:22-slim`, `npm ci`,
`prisma generate` obligatorio porque `src/generated` está gitignoreado, entrypoint que
migra y siembra antes de levantar Fastify). `frontend/Dockerfile` multi-etapa con
`output: 'standalone'`, copiando a mano `public/` y `.next/static` que el standalone no
incluye. `compose.yaml` en la raíz con los tres servicios, healthcheck en los tres, y
solo `web` publicando el puerto 3000. `.env.example` como plantilla del `.env` de
producción. `DEPLOY.md` con el procedimiento completo.

## Los roles del panel (2026-09-21)

**El problema.** El panel invitaba gente con tres roles —Administrador, Editor y Solo
lectura— desde que existe el alta de usuarios, y ninguna ruta los miraba. Los trece
handlers privados de `frontend/src/app/api/` preguntaban lo mismo, "¿hay sesión?", y
seguían de largo. En la práctica los tres roles eran uno solo: un invitado como Solo
lectura podía cargar y borrar vehículos, mover consultas y turnos, ver los costos
internos y editar la configuración de la agencia. El backend ya distinguía roles en
`/users` con `requireRole`; el borde de Next no tenía nada equivalente.

**La matriz, tal como quedó:**

| | Solo lectura | Editor | Administrador |
|---|---|---|---|
| Ver dashboard, stock, consultas, turnos, configuración | sí | sí | sí |
| Cargar, editar y borrar vehículos | no | sí | sí |
| Cambiar estado de consultas y turnos | no | sí | sí |
| Ver costos internos y margen | **no** | sí | sí |
| Configuración de la agencia y notificaciones | no | no | sí |
| Usuarios del panel | no | no | sí (ya lo hacía el backend) |

**Cómo está hecho.** `frontend/src/lib/roles.ts` tiene la regla como función pura,
`puede(rol, accion)` sobre tres acciones: leer, escribir, administrar. Pura y sin
`next/server` adentro por dos razones: se testea sin mocks, y deja intacta la costura
que los tests del borde ya mockeaban —meter la verificación dentro de `getSession`
habría roto `reparto-publico.test.ts`—. El rechazo es **403 y no 401**: un 401 manda a
`/login`, y mandar ahí a alguien que ya inició sesión lo deja dando vueltas.

Los costos se recortan en el borde con `toPanelVehicle(v, rol)`, al lado de
`toPublicVehicle`. Los campos quedan **ausentes, no en cero**: el cero ya significa "sin
cargar" en este modelo —los seis vehículos reales lo tienen así— y usarlo para tapar un
costo haría que el panel diga algo falso. En el dashboard se marcan en el dato
(`interno: true`) las tres métricas que salen de costos; las otras dos, que salen de
precios públicos, se siguen mostrando.

Para que la UI sepa el rol, `getSessionFromCookies()` agrega una segunda puerta a la
misma pregunta al backend, y cada `page.tsx` del panel pasa el rol a su vista. **Eso
decide qué se dibuja, no qué se permite:** la autorización sigue entera en las rutas.

**Dos consecuencias que conviene tener presentes:**

- Las cuatro páginas del panel pasaron a **dinámicas** porque leen la cookie. El
  dashboard sigue estático: no necesita el rol.
- Si el backend no responde, esas páginas **redirigen a `/login`** en vez de dibujarse y
  fallar al pedir datos. Es la misma decisión de fallar cerrado que ya tomaba
  `getSession`, pero es distinto a lo de antes.

**Verificación de esta ronda**, corrida sobre cada uno de los tres commits:

- Tanda 1 (guardas): **139 tests, 13 archivos**; typecheck limpio.
- Tanda 2 (costos): **149 tests, 15 archivos**; typecheck limpio.
- Tanda 3 (panel): **155 tests, 16 archivos**; typecheck limpio; `npm run build` compila,
  33 rutas.

El backend no se tocó, así que sus 64 tests no se volvieron a correr.

**Lo que no se verificó.** No se probó el panel en un navegador con un usuario real de
rol Solo lectura —pide el backend levantado y un invitado con ese rol—. Los tests
cubren el borde HTTP y la lógica; el recorte visual lo verificó el compilador.

## Cómo retomar

No queda nada por implementar en el repo. Para llevar esto a producción:

1. Seguir `DEPLOY.md` de punta a punta, en el Debian del lab.
2. Correr la "Verificación final en el servidor" que `DEPLOY.md` trae en su sección de
   Verificación — no está terminado hasta que esa lista pasa ahí, no en local.
3. No hay nada que integrar: las dos ramas ya están mergeadas a `master`. Lo que sí
   queda es **pushear**: `master` está cinco commits adelante de `origin/master`.

```bash
# Comprobar que nada se rompió antes de tocar nada
cd backend && npm test && npm run typecheck
cd ../frontend && npm test && npm run typecheck && npm run build
```

## Lo que va a hacer falta de tu lado

Cuatro cosas, ninguna de las cuales se resuelve en el repo:

1. Un **repositorio privado en GitHub**. Hoy el proyecto vive en un solo disco y no
   tiene remoto configurado; el primer paso de `DEPLOY.md` es crearlo y clonarlo en el
   servidor.
2. El **Debian del lab**, con `docker` y `tailscaled` corriendo, y **HTTPS y Funnel
   habilitados** en la consola del tailnet — sin eso, `tailscale funnel` no tiene nada
   que publicar.
3. Acceso a **Google Cloud Console** para dar de alta el redirect URI de la URL de
   Funnel. Se **agrega**, no reemplaza al de `localhost`. Si se olvida, el síntoma es
   `redirect_uri_mismatch` de Google, no un error de la app.
4. El **mail de Google del dueño** para `BOOTSTRAP_ADMIN_EMAIL` — va a ser el primer
   administrador del panel. Opcionalmente, un segundo correo para `SEED_INVITED_EMAIL`.

## Riesgos que el plan ya marcó, para no re-descubrirlos

- **Prisma en `node:22-slim`.** Si `migrate deploy` falla por OpenSSL, la alternativa es
  `node:22-bookworm`. Se verificó en el build local (Task 14) sin problema; queda
  anotado por si el Debian del lab se comporta distinto.
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

## Deudas conocidas, sin resolver

- **El store del panel sigue en memoria.** Lo que el dueño cargue desde el panel se pierde
  en cada reinicio del contenedor. Está fuera del alcance de este plan a propósito: es su
  propio ciclo.
- **No se pueden subir fotos desde el panel.** Las 45 de la semilla se versionan en el
  repo; un vehículo nuevo va a mostrar el marcador de bandas.
- **El panel no muestra quién está conectado ni con qué rol.** El rol ya llega a las
  vistas y decide qué se dibuja, pero `AdminShell` no lo dice en ningún lado: alguien
  con Solo lectura ve un panel con menos cosas sin que nada le explique por qué.
- **`PATCH /users/:id` revoca las sesiones del afectado siempre**, así que un admin que se
  edite a sí mismo el `status` se desloguea solo.
- **`npm audit` en el frontend queda con 2 High y 1 Moderate, ningún Critical.** Next se
  corrió a `15.5.25`, que cierra los tres advisories críticos de `15.5.4` (tres RCE: el
  protocolo flight de React, la Image Optimization API vía AVIF, y uno de servers Windows
  que no aplica en Debian) más los bypass de middleware en App Router, que es lo que
  protege `/admin`. Lo que queda son transitivos de `next` que este bump no cierra:
  `postcss` (High, lectura de archivos vía `sourceMappingURL`; corre en build, no en el
  server expuesto), `sharp` (High, libvips/libheif) y el Moderate que `next` hereda del
  mismo `postcss`. Cerrarlos pide `next@16`, que es un major y es una decisión aparte.
