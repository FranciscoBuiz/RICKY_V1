# 5848 Motors

Réplica en Next.js del prototipo de diseño de 5848 Motors (agencia de vehículos
en Mar del Plata): sitio público + panel de administración.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Node
(route handlers) · CSS variables. Sin dependencias de UI de terceros.

## Estructura

```
frontend/   App Next.js (sitio publico + panel admin + route handlers actuales)
backend/    Servicio Fastify: ingreso con Google (OIDC), sesiones y usuarios
```

## Puesta en marcha

Hacen falta **tres cosas corriendo**: Postgres en Docker, el backend y el
frontend, en ese orden. Antes de empezar, `backend/.env` necesita **credenciales
de Google** (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`): sin ellas el ingreso
al panel no funciona. Cómo obtenerlas está en `backend/README.md`.

```bash
# 1. Base de datos (Docker Desktop tiene que estar corriendo)
cd backend
npm install
npm run db:up                 # Postgres 17 en :5432
npx prisma migrate deploy
npm run db:seed               # crea el admin de BOOTSTRAP_ADMIN_EMAIL

# 2. Backend, en su propia terminal
npm run dev                   # http://localhost:4000

# 3. Frontend, en otra terminal
cd ../frontend
npm install
npm run dev                   # http://localhost:3000
```

Después: `npm run build`, `npm start` y `npm run typecheck` en `frontend/`;
`npm test` y `npm run typecheck` en `backend/`.

El navegador **nunca habla con el backend**: Next hace de BFF y reenvía
`/api/auth/*` y `/api/settings/users*` a `:4000`. Por eso el URI de
redireccionamiento que se carga en Google apunta al **3000**, no al 4000.

## Rutas

### Sitio público

| Ruta | Prototipo | Notas |
| --- | --- | --- |
| `/` | `Home.dc.html` | Hero en video, stock destacado, buscador rápido |
| `/catalogo` | `Catalogo.dc.html` | Filtros y orden contra la API; loading / vacío / error |
| `/vehiculos/[id]` | `VehiculoDetalle.dc.html` | Galería con lightbox, ficha técnica, formulario de consulta |
| `/nosotros` | `Nosotros.dc.html` | Editorial + timeline de proceso |
| `/contacto` | `Contacto.dc.html` | Datos de contacto y formulario |
| `/vender-mi-auto` | `VenderMiAuto.dc.html` | Formulario de 4 pasos con carga de imágenes |
| `/detailing` | `Detailing.dc.html` | Hero en video y servicios |
| `/detailing/turno` | `DetailingTurno.dc.html` | Reserva en 3 pasos con cupo diario real |
| `/login` · `/registro` · `/recuperar-password` | `Login` · `Registro` · `RecuperarPassword` | Flujos de auth |
| cualquier otra | `404.dc.html` | `not-found.tsx` |

Los props tweakables de `DetailingTurno` viajan por query string:
`/detailing/turno?modo=simplificado` acorta el catálogo de servicios y
`?multiple=0` vuelve a la selección de un único servicio (por defecto se pueden
combinar varios en el mismo turno).

### Turnos de detailing

Un turno ocupa el **día completo**: el cliente deja el vehículo a primera hora y
lo retira a última. Por eso la reserva se hace por fecha, sin grilla de
horarios, y lo que limita la agenda es un **cupo diario** configurable en
`/admin/configuracion` → General → *Turnos de detailing* (cupo, hora de entrega
y hora de retiro). El cupo se revalida en el POST: si el día se llenó mientras
el visitante completaba sus datos, la API responde `409` y el flujo lo manda a
elegir otra fecha.

### Panel (`/admin`)

| Ruta | Prototipo |
| --- | --- |
| `/admin` | `AdminDashboard.dc.html` |
| `/admin/vehiculos` | `AdminVehiculos.dc.html` |
| `/admin/detailing` | `AdminDetailing.dc.html` |
| `/admin/consultas` | `AdminConsultas.dc.html` |
| `/admin/configuracion` | `AdminConfiguracion.dc.html` |
| `/admin/dashboard-v1` | `AdminDashboard v1.dc.html` (versión anterior, conservada) |

> `/admin` ya **exige sesión**: sin la cookie `motors_session` el middleware
> manda a `/login`, y el backend es el único que decide si el token sirve. Lo
> que sigue sin proteger es `/api/admin/*`, que además lee y escribe contra el
> store en memoria de Next; se cubre cuando esos endpoints se muden al backend.

## API

Servida por route handlers de Next (Node). Toda la UI habla con estos endpoints;
la capa de datos vive en `src/server/store.ts`.

```
GET    /api/vehicles                 catálogo público (filtros + orden)
GET    /api/vehicles/[id]            ficha pública (sin datos de costo)
GET    /api/admin/vehicles           stock completo (compra, gastos, margen)
POST   /api/admin/vehicles
PATCH  /api/admin/vehicles/[id]
DELETE /api/admin/vehicles/[id]
GET    /api/admin/dashboard          alertas, agenda del día, leads, métricas
GET    /api/leads                    POST /api/leads          PATCH /api/leads/[id]
GET    /api/appointments             POST /api/appointments   PATCH /api/appointments/[id]
GET    /api/appointments/availability?from=YYYY-MM-DD&days=N   cupo por día
GET    /api/services
GET    /api/sell-requests            POST /api/sell-requests
GET    /api/settings                 PATCH /api/settings
GET    /api/settings/users           POST /api/settings/users  PATCH · DELETE /api/settings/users/[id]
GET    /api/settings/notifications   PATCH /api/settings/notifications
GET    /api/auth/google  ·  /api/auth/google/callback  ·  /api/auth/me  ·  POST /api/auth/logout
```

`purchasePrice` y `expenses` sólo se exponen bajo `/api/admin/*`; el catálogo
público los recorta con `toPublicVehicle()`.

## Estructura

```
src/
  app/            rutas (páginas + route handlers en app/api)
  components/     site/ (header, footer, tarjeta, auth) · admin/ (shell)
  lib/            theme, hooks, formato es-AR, cliente de API, tokens de diseño
  server/         store en memoria + datos semilla
  types/          modelo de dominio compartido
```

## Sistema de diseño

Los tokens del prototipo viven en `src/app/globals.css` como CSS variables
(`--bg`, `--ink`, `--muted`, `--border`, `--card`, `--accent`, …). El modo
oscuro se conmuta con `data-theme` en `<html>`, se persiste en `localStorage`
bajo `m5848_dark` y se aplica antes del primer paint con un script inline, así
que no hay parpadeo. `.admin-surface` cambia la paleta del sitio por la del
panel sin duplicar componentes.

**Responsive.** El layout se reencuadra desde el token `--gutter` (28 → 20 → 16
px según el ancho), así que no hace falta tocar cada sección. Las grillas usan
`minmax(min(100%, N), 1fr)` para no desbordar en pantallas angostas y las tablas
del panel scrollean dentro de su propio contenedor.

**Interacción.** Como los colores viajan inline, el hover global se pinta con un
`box-shadow: inset` sobre `--hover-tint`: funciona sobre cualquier fondo sin
pelearse con el estilo del componente. Las utilidades son `.ui-btn` (links con
forma de botón), `.ui-link` (links de texto), `.ui-row` (filas de tabla),
`.ui-lift` (tarjetas que se levantan) y `.skeleton` (bloque de carga con
brillo). Todo respeta `prefers-reduced-motion`.

### Componentes compartidos (`src/components/ui`)

| Componente | Para qué |
| --- | --- |
| `ToastProvider` / `useToast` | Carteles de aviso globales. Montado en `layout.tsx`; toda escritura contra la API reporta su error acá |
| `ErrorState` | Bloque de error con reintento, para cuando falla una carga |
| `Skeleton` · `SkeletonTable` · `SkeletonCard` | Esqueletos de carga |
| `TextField` · `TextAreaField` | Input controlado que aplica la regla de su `kind` (`src/lib/fields.ts`): recorta lo que se puede tipear, valida al salir del campo y muestra el motivo |
| `AutocompleteField` | Igual que `TextField`, más una lista de sugerencias (patrón ARIA de combobox) |

### Autocompletado de marca / modelo / versión

El paso "Vehículo" de `/vender-mi-auto` y el alta de `/admin/vehiculos` sugieren
mientras se tipea: escribir
"to" ofrece **Toyota** antes que Foton, porque `rankSuggestions()` pone primero
las coincidencias por prefijo y después las que contienen el término, ignorando
mayúsculas y tildes ("citroen" encuentra a Citroën).

Las sugerencias se encadenan: la marca acota los modelos y el modelo acota las
versiones. El catálogo vive en `src/lib/brands.ts` y es **best-effort** — las
marcas están completas, los modelos cubren lo que se vende en Argentina y las
versiones sólo los modelos de mayor volumen. Donde no hay datos, el campo
simplemente no sugiere. Nada de esto restringe: los tres campos siguen
aceptando texto libre, así que una marca que falte en la lista se puede escribir
igual.

No confundir con `brandOptions` de `@/server/data/vehicles`: aquéllas son las
marcas **en stock** y filtran el catálogo público.

**Teclado.** Con la lista abierta, `Tab` (y `Shift+Tab`) recorre las opciones en
lugar de saltar al campo siguiente, `Enter` elige la resaltada y `Esc` cierra la
lista y devuelve a `Tab` su comportamiento normal. La lista no se abre al recibir
el foco con el campo vacío, así que tabular por un formulario en blanco no queda
atrapado; el pie de la lista recuerda las tres teclas.

### Validación de formularios

`src/lib/fields.ts` define una regla por tipo de campo: qué se puede tipear,
qué es válido y qué atributos necesita el teclado del celular.

| `kind` | Regla |
| --- | --- |
| `name` | Sólo letras, espacios y guiones; mínimo 2 caracteres |
| `email` | Sin espacios, con `@` y dominio |
| `phone` | Sólo dígitos, exactamente 10 (área + número, sin 0 ni 15) |
| `plate` | Mayúsculas alfanuméricas: `ABC123` o `AB123CD` |
| `year` | 4 dígitos entre 1950 y el año próximo |
| `integer` · `money` | Sólo dígitos |

Los formularios arman su botón de envío con `fieldsValid([...])`: arranca gris y
sólo se habilita cuando todos los obligatorios pasan.

## Estado de los datos

El store es **en memoria**: las altas y ediciones persisten mientras el proceso
viva y se reinician al reiniciar el servidor. Reemplazar `src/server/store.ts`
por una base real no toca la UI.

## Pendientes

- Proteger `/api/admin/*`: hoy se sirve desde Next contra el store en memoria.
- Base de datos, storage de imágenes y API de WhatsApp.
- Fotos reales del stock (hoy son marcadores de bandas diagonales).
- Copy definitivo: número de WhatsApp (`NEXT_PUBLIC_WHATSAPP_NUMBER`), horarios y redes.
