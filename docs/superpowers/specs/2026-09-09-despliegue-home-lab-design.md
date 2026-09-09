# Despliegue de la demo en el home lab

**Fecha:** 2026-09-09
**Estado:** pendiente de revisión
**Alcance:** poner RICKY_V1 en el Debian del home lab, accesible desde internet, con
el catálogo cargado con los vehículos reales de la agencia.

## Problema

El proyecto corre solo en la máquina de desarrollo, en dos `npm run dev`. No hay
imágenes, ni compose de producción, ni procedimiento escrito. El objetivo inmediato es
el mismo que tenía la versión anterior del producto: **mostrarle la demo al dueño de la
concesionaria para que decida si le gusta**, abriendo un link en su celular.

Salir a internet con lo que hay hoy tiene dos bloqueos que no son de despliegue:

1. **`/api/*` no tiene autorización.** `frontend/src/middleware.ts:22` protege las
   páginas del panel con `matcher: ['/admin/:path*']`, pero una ruta que empieza con
   `/api` no matchea ese patrón, y las rutas de API no comprueban nada por su cuenta.
   `GET /api/admin/vehicles` devuelve `purchasePrice`, `expenses` y margen — que
   PRODUCT.md define como internos — a cualquiera que conozca la URL. `GET /api/leads`
   y `GET /api/appointments` devuelven nombre, teléfono y email de cada contacto.
   `POST`/`PATCH`/`DELETE` de `/api/admin/vehicles` escriben sin sesión.
2. **El catálogo no tiene ni una foto.** El modelo `Vehicle` no tiene campo de
   imágenes; el sitio dibuja marcadores de bandas diagonales. Un catálogo de usados sin
   fotos es lo primero que el dueño va a mirar.

Los datos reales existen: viven en el proyecto anterior (`Nueva carpeta` en el
escritorio), seis vehículos con 45 fotos.

## Alcance

**Entra:**

- Autorización real sobre las rutas `/api/*` que hoy están abiertas.
- Campo de imágenes en el modelo de dominio, y las 45 fotos reales servidas en el
  catálogo, la ficha y el panel.
- Los seis vehículos reales de la agencia, con sus datos.
- Semilla del panel con un elemento por cada estado de cada entidad que tenga estados,
  con una excepción deliberada: los vehículos, que son datos reales (Decisión 8).
- `Dockerfile` para cada servicio, `compose.yaml` de producción, `.dockerignore`.
- `output: 'standalone'` en `frontend/next.config.ts`.
- `DEPLOY.md` con el procedimiento, la verificación y las limitaciones conocidas.

**No entra:**

- **Mudar el store en memoria a Postgres.** Sigue siendo la deuda que PRODUCT.md ya
  registra y tiene que ser su propio ciclo. Consecuencia asumida: los datos que el
  dueño cargue en el panel se pierden en cada reinicio del contenedor.
- **Storage para fotos subidas desde el panel.** Las 45 fotos de la semilla se
  versionan en el repo; subir una foto nueva desde el panel sigue sin existir.
- **La API de WhatsApp.** Los enlaces `wa.me` sí quedan activos (ver Decisión 7).
- **Actualizar `next@15.5.4`**, con sus 3 vulnerabilidades conocidas. Es una decisión
  aparte porque puede romper cosas.

## Decisiones y por qué

**1. Un solo puerto público: Next por Tailscale Funnel.** El backend y Postgres no
publican puertos al host. Next ya proxea al backend (`frontend/src/lib/proxy.ts`), así
que exponer el backend no agrega nada y sí superficie. Funnel funciona detrás de CGNAT,
no abre puertos y trae HTTPS. Es el camino ya probado en el proyecto anterior.

**2. Nginx Proxy Manager no participa.** El NPM del lab solo enruta en la LAN. Un
origen HTTP en la LAN no puede hacer login: la cookie de sesión es `secure` en
producción (`backend/src/auth/routes.ts:61`) y Google no acepta redirect URIs `http://`
fuera de localhost. Dos orígenes serían dos comportamientos distintos del panel.

**3. Imágenes construidas en el Debian**, no en un registry. Una sola máquina
involucrada y nada que autenticar. El costo es un par de minutos de build por
actualización, aceptable para la frecuencia real.

**4. Cerrar `/api/*` antes de exponer**, no después. Los datos hoy son semilla, pero la
demo existe para que el dueño cargue stock real. En ese momento serían costos reales de
la agencia en un endpoint público, y los `POST` permitirían escribir en la demo
mientras se la muestra.

**5. Precios en USD.** Los seis vehículos están publicados en dólares y sus ids ya
circularon por WhatsApp. Convertir a pesos inventa una cotización que envejece en
semanas. PRODUCT.md dice "precios en pesos" como supuesto del prototipo, no como dato
confirmado del negocio.

**6. `purchasePrice` y `expenses` quedan en cero, y el panel lo dice.** Son costos
reales de la agencia que no tenemos. Inventarlos contradice el Principio 2 de
PRODUCT.md, y el riesgo concreto es que el dueño lea un margen falso sobre sus propios
autos.

**7. `NEXT_PUBLIC_WHATSAPP_NUMBER=5492233122894`.** El número real, tomado de
`src/lib/whatsapp.ts` del proyecto anterior. Deja de estar "sin definir" y hay que
actualizar PRODUCT.md. Se hornea en el build: si cambia, hay que reconstruir la imagen,
no reiniciar.

**8. Los seis vehículos reales quedan todos en `available`.** Los estados `reserved` y
`sold` no se simulan sobre ellos. El estado del vehículo se muestra en el **sitio
público**, donde un "Vendido" falso sobre un auto que la agencia tiene a la venta es
engañoso para un comprador. Los estados de consultas y turnos sí se cubren completos,
porque esos registros ya son de demostración declarada.

## Fase 1 — Autorización de `/api/*`

Un helper nuevo, `frontend/src/lib/session.ts`:

```ts
export async function requireSession(request: Request): Promise<SessionUser | null>
```

Reenvía la cookie entrante a `GET {BACKEND_URL}/auth/me` y devuelve el usuario o
`null`. Sigue el patrón de `proxyToBackend`: la decisión es del backend, que es el
único que sabe si el token sirve. No se replica lógica de sesión en Next.

Cada ruta protegida empieza con esa llamada y responde `401` con el formato de error
que ya usa el resto de la API si vuelve `null`.

**Reparto explícito.** Este reparto es el contrato; cualquier ruta nueva tiene que
ubicarse en una de las dos columnas.

| Público | Requiere sesión |
|---|---|
| `GET /api/vehicles` | `GET /api/admin/dashboard` |
| `GET /api/vehicles/[id]` | `GET`, `POST /api/admin/vehicles` |
| `GET /api/services` | `GET`, `PATCH`, `DELETE /api/admin/vehicles/[id]` |
| `GET /api/appointments/availability` | `GET /api/leads` |
| `GET /api/settings` | `PATCH /api/leads/[id]` |
| `POST /api/leads` | `GET /api/appointments` |
| `POST /api/appointments` | `PATCH /api/appointments/[id]` |
| `POST /api/sell-requests` | `PATCH /api/settings` |
| | `/api/settings/notifications` |

Los tres `POST` públicos son el formulario de contacto, la reserva de turno y
vender-mi-auto: son el punto del producto según el Principio 1 de PRODUCT.md y no
pueden pedir sesión. `GET /api/settings` es público porque el sitio muestra dirección y
horarios; el `PATCH` no.

`/api/settings/users*` ya proxea al backend, que aplica `soloAdmin`. No cambia.

**Testing.** `frontend/package.json` no tiene runner de tests. Se agrega `vitest`, con
tests acotados a esta fase: el helper contra un `/auth/me` simulado (200, 401, backend
caído), y una tabla que recorre el reparto de arriba verificando que cada combinación
ruta/método responde `401` sin cookie y no `401` con sesión válida. Un guard sin test es
lo que se cae en silencio en el próximo refactor.

## Fase 2 — Vehículos reales y fotos

### Cambios al modelo (`frontend/src/types/index.ts`)

```ts
export interface VehicleImage { src: string; alt: string }

// En Vehicle:
images: VehicleImage[];              // vacío = marcador de bandas, como hoy
bodyType: 'Sedán' | 'SUV' | 'Hatchback' | 'Pick-up' | 'Moto';
fuel: 'Nafta' | 'Diesel' | 'Nafta/GNC';
engine?: string;                     // pasan a opcionales: no hay dato real
traction?: string;
doors?: number;
description?: string;
```

`engine`, `traction`, `doors` y `description` pasan a opcionales en vez de llenarse con
texto inventado. La ficha omite la fila que no tiene dato — el mismo criterio que usaba
`specsDe()` en el proyecto anterior: las specs se arman de los campos reales y se
saltean los que nadie cargó.

`price` pasa a interpretarse en USD. Se ajusta el formateo de precio y los rangos del
filtro `priceMax`, que hoy están pensados para millones de pesos.

`purchasePrice` y `expenses` quedan en `0`. El panel muestra "sin cargar" en la columna
de margen en lugar de calcular un margen del 100 %.

### Fotos

Las 45 fotos se copian de `Nueva carpeta/public/vehiculos/<id>/NN.jpg` a
`frontend/public/vehiculos/<id>/NN.jpg`, misma estructura. Son 12 MB que se suman a los
18 MB de video que el repo ya versiona.

| id | Vehículo | Fotos |
|---|---|---|
| `etios17` | Toyota Etios XLS 2017 | 10 |
| `hilux18` | Toyota Hilux SW4 SRX 2018 | 9 |
| `palio15` | Fiat Palio Essence 1.6 16v 2015 | 8 |
| `fox17` | Volkswagen Fox Comfort 2017 | 7 |
| `etios16` | Toyota Etios XLS 2016 | 6 |
| `pcx26` | Honda PCX Deluxe 0 km | 5 |

El texto alternativo nombra el vehículo y nada más (`'Toyota Etios XLS 2017 blanco'`,
`'…, foto 2'`). Nadie rotuló qué muestra cada toma, y un alt que afirma "interior" sobre
una foto del baúl es peor que no tenerlo.

Se agrega la regla de `Cache-Control` inmutable de `/uploads/:path*` también para
`/vehiculos/:path*` en `next.config.ts`: son assets versionados por nombre igual que los
videos.

### Componentes que se tocan

La card del catálogo, la galería de la ficha y la tabla del panel dibujan hoy el
marcador de bandas diagonales. Pasan a renderizar la primera imagen (o la galería
completa en la ficha) **cuando `images` no está vacío**, y a conservar el marcador
cuando lo está. El marcador no se borra: es lo que va a ver cualquier vehículo que el
dueño cargue desde el panel, que no tiene forma de subir fotos.

### Los datos

Los ids son los del proyecto anterior y **no se tocan**: ya están compartidos por
WhatsApp. `version` sale del modelo (`XLS`, `SRX`, `Essence 1.6 16v`, `Comfort`,
`Deluxe`), `color` del texto alternativo de las fotos, y `bodyType` se infiere del
modelo. `featured: true` solo en `etios17`, como en el original.

## Fase 3 — Semilla con todos los estados

El panel tiene que mostrar cada estado posible de cada entidad, para que el dueño vea
cómo se ven y qué acciones ofrecen.

| Entidad | Estados | Cómo se cubre |
|---|---|---|
| `Lead` | `new`, `contacted`, `negotiating`, `closed`, `discarded` | Cinco consultas de demostración, una por estado. |
| `Appointment` | `pending`, `confirmed`, `in_progress`, `completed`, `cancelled` | Cinco turnos, uno por estado, con fechas coherentes: `completed` y `cancelled` en el pasado, `pending` y `confirmed` a futuro. |
| `ActionAlertType` | `urgent`, `important`, `pending` | Tres alertas en el dashboard. |
| `PanelUser` | `ACTIVE`, `PENDING` | El admin de bootstrap queda `ACTIVE` en su primer login; el seed del backend agrega un segundo usuario invitado que queda `PENDING`. |
| `Vehicle` | `available`, `reserved`, `sold` | **No se cubre sobre los vehículos reales** (Decisión 8). Los tres estados siguen existiendo en el panel; ninguno de los seis autos reales se marca con un estado falso. |
| `SellRequest` | — | No tiene campo de estado. Nada que cubrir. |

Las consultas y turnos de demostración se nombran de forma que se lean como
demostración, no como contactos reales.

## Fase 4 — Empaquetado y despliegue

### Topología

```
internet → Funnel → :3000  web      (Next standalone)
                             ↓ BACKEND_URL=http://backend:4000
                           backend  (Fastify + tsx)
                             ↓ DATABASE_URL=…@db:5432
                           db       (postgres:17-alpine, volumen)
```

`backend` y `db` no publican puertos al host: solo existen en la red del compose.

### Archivos

| Archivo | Contenido |
|---|---|
| `compose.yaml` (raíz) | Los tres servicios. Nuevo y separado: `backend/docker-compose.yml` sigue siendo el Postgres de desarrollo y no se toca. |
| `backend/Dockerfile` | `node:22-slim`, `npm ci`, **`prisma generate`**, entrypoint. |
| `backend/docker-entrypoint.sh` | `prisma migrate deploy` → seed si hay `BOOTSTRAP_ADMIN_EMAIL` → `exec` a Fastify. |
| `frontend/Dockerfile` | Multi-etapa con `output: 'standalone'`. |
| `backend/.dockerignore`, `frontend/.dockerignore` | Sin esto el contexto arrastra `node_modules`, `.next` y los 30 MB de assets en cada build. |
| `.env.example` (raíz) | Plantilla del `.env` de producción. |
| `DEPLOY.md` | El procedimiento. |

Dos trampas que el Dockerfile tiene que resolver explícitamente:

- **`backend/src/generated` está gitignoreado.** Un clone limpio no trae el cliente de
  Prisma: `prisma generate` es obligatorio dentro del build. Es el error que rompe el
  primer despliegue y no aparece nunca en desarrollo.
- **El `standalone` de Next no copia `public/` ni `.next/static`.** Hay que copiarlos a
  mano. Si se olvida, el sitio levanta sin CSS, sin fotos y sin videos, y el síntoma
  parece un problema de estilos.

**`node:22-slim` y no `alpine` para el backend:** el motor de migraciones de Prisma es
donde musl y OpenSSL suelen romper, y `migrate deploy` es el paso del que depende todo
el arranque. Se verifica en el build antes de dar la fase por terminada.

### Arranque

`db` con el `pg_isready` que ya existe en el compose de desarrollo. `backend` con
healthcheck contra `/health` (`backend/src/app.ts:25`). `web` espera a `backend` sano.
Los tres con `restart: unless-stopped`, que es lo que hace que el stack vuelva solo
después de un corte de luz.

Si `migrate deploy` falla, el contenedor sale y Docker reintenta; el log dice por qué.
Es preferible a un backend arriba contra un esquema viejo.

El seed es idempotente (`upsert` con `update: {}`), así que correrlo en cada arranque es
seguro.

## Configuración

Un solo `.env` en la raíz, que lee `compose.yaml`. Distinto de los dos de desarrollo
(`backend/.env` y `frontend/.env.local`), que no se tocan.

**Primero: el `.gitignore` de la raíz ignora `.env*.local` pero no `.env` a secas.**
`backend/.gitignore` sí lo tiene, por eso nunca se notó. Un `.env` de producción en la
raíz se commitearía con los secretos adentro, y un secreto commiteado no se borra del
historial. Agregar `.env` es la primera línea del plan.

```bash
POSTGRES_USER=motors
POSTGRES_PASSWORD=<openssl rand -base64 24>
POSTGRES_DB=motors

NODE_ENV=production
DATABASE_URL=postgresql://motors:<esa contraseña>@db:5432/motors
APP_ORIGIN=https://<máquina>.<tailnet>.ts.net
OAUTH_REDIRECT_URI=https://<máquina>.<tailnet>.ts.net/api/auth/google/callback
GOOGLE_CLIENT_ID=<el mismo de desarrollo>
GOOGLE_CLIENT_SECRET=<el mismo>
SESSION_COOKIE_SECRET=<uno nuevo, 32 bytes hex>
BOOTSTRAP_ADMIN_EMAIL=<la cuenta de Google del operador>

BACKEND_URL=http://backend:4000
```

`NEXT_PUBLIC_WHATSAPP_NUMBER=5492233122894` no va acá: se hornea en el build, así que va
como `args:` del servicio `web`.

### El orden de los pasos importa

El DEPLOY.md anterior levantaba el stack, sacaba la URL de Funnel, la ponía en el `.env`
y reconstruía. **Acá eso no puede funcionar:** `backend/src/env.ts` valida `APP_ORIGIN` y
`OAUTH_REDIRECT_URI` como URLs al arrancar y el proceso muere si faltan. El backend nunca
llegaría a levantar para que Funnel tenga qué publicar.

La salida es que la URL se sabe antes de encender nada: `tailscale status` imprime el
nombre apenas la máquina está en el tailnet.

1. `tailscale up`, leer el nombre. Sin Funnel y sin stack todavía.
2. Escribir el `.env` completo con esa URL.
3. Dar de alta el redirect URI en Google Cloud Console. **Se agrega, no se reemplaza:**
   el `http://localhost:3000/...` de desarrollo se queda. Es el único paso fuera del
   servidor, y si se olvida el síntoma es un `redirect_uri_mismatch` de Google, no un
   error de la app.
4. `docker compose up -d --build`.
5. `tailscale funnel --bg 3000`.

`NODE_ENV=production` es obligatorio y tiene consecuencia: es lo que activa `secure` en
la cookie de sesión. Por eso el sitio solo funciona por HTTPS.

## Verificación

Cada paso con su salida esperada, y todo esto va también en el DEPLOY.md:

```bash
docker compose ps                                              # los tres healthy
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000        # 200
docker compose exec web wget -qO- http://backend:4000/health   # {"ok":true}
curl -s localhost:4000/health                                  # connection refused
curl -s -o /dev/null -w "%{http_code}\n" \
  localhost:3000/api/admin/vehicles                            # 401
curl -s localhost:3000/api/vehicles | head                     # los 6 vehículos
tailscale funnel status                                        # imprime la URL
```

El cuarto y el quinto son los que confirman que el diseño se cumplió: el backend no se
alcanza desde el host, y el panel no se alcanza sin sesión.

A mano, desde afuera: abrir la URL en el celular, ver las fotos en el catálogo, entrar a
`/admin`, loguearse con Google, y comprobar que el usuario pasó a `ACTIVE`:

```bash
docker compose exec -T db psql -U motors -d motors \
  -c 'select email, role, status from "User";'
```

## Operación

- **Actualizar:** `git pull && docker compose up -d --build`.
- **Respaldo:** `docker compose exec -T db pg_dump -U motors motors > respaldo.sql`, con
  una advertencia honesta en el DEPLOY.md: hoy en Postgres solo hay usuarios y sesiones.
  El stock, las consultas y los turnos están en memoria y no se respaldan porque no
  sobreviven al reinicio.
- **Mudanza al dominio de la empresa:** el compose no cambia. Se apaga Funnel, se pone un
  proxy adelante de `127.0.0.1:3000` con el certificado del dominio real, y se cambian
  `APP_ORIGIN` y `OAUTH_REDIRECT_URI` — más el alta del nuevo redirect URI en Google.

## Riesgos y cosas a verificar durante la implementación

- **Prisma en `node:22-slim`.** Si `migrate deploy` falla por OpenSSL, la alternativa es
  `node:22-bookworm`. Verificar en el primer build, no en el servidor.
- **El peso del contexto de build.** 30 MB de assets más `node_modules`: si el build en
  el Debian tarda de más, el `.dockerignore` es lo primero a revisar.
- **El filtro `priceMax` con precios en USD.** Los rangos actuales están pensados para
  millones de pesos; con USD quedan todos los vehículos de un lado. Hay que revisar el
  control, no solo el formateo.
- **`GET /auth/me` en cada request de `/api/admin/*`** agrega un salto interno por
  llamada. En la red del compose es despreciable, pero conviene confirmarlo con el panel
  abierto y no asumirlo.
- **Prioridad de arranque en el lab.** Si el Debian reinicia, `docker` y `tailscaled`
  tienen que volver antes que nada; `restart: unless-stopped` cubre los contenedores,
  Funnel con `--bg` cubre el resto.
- **Corte de luz o de internet en el lab = la demo muere.** Conviene avisarle al dueño
  antes de mandarle el link, no después.

## Lo que el DEPLOY.md deja escrito como no cubierto

1. **Los datos del panel se reinician con el contenedor.** Store en memoria. Si el dueño
   carga un vehículo y el contenedor se reinicia, se pierde.
2. **No se pueden subir fotos desde el panel.** Las 45 de la semilla están versionadas en
   el repo; no hay storage.
3. **`purchasePrice` y `expenses` están en cero** a propósito, y el margen aparece como
   "sin cargar".
4. **`next@15.5.4` tiene 3 vulnerabilidades conocidas**, una de RCE, previas a este
   trabajo.
