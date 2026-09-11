# Despliegue en el home lab

Procedimiento para poner 5848 Motors en el Debian del home lab, publicado a internet
por Tailscale Funnel. Spec de referencia:
`docs/superpowers/specs/2026-09-09-despliegue-home-lab-design.md`.

Topología:

```
internet → Funnel → :3000  web      (Next standalone)
                             ↓ BACKEND_URL=http://backend:4000
                           backend  (Fastify)
                             ↓ DATABASE_URL=…@db:5432
                           db       (postgres:17-alpine, volumen)
```

`backend` y `db` no publican puertos al host: solo `web` es alcanzable, y solo en
`127.0.0.1:3000`. Funnel proxea desde loopback, así que la app sale a internet por
HTTPS sin quedar servida en HTTP plano a la LAN. Ojo con esto si probás desde otra
máquina de la red: `http://<ip-del-debian>:3000` no responde, y está bien que no lo haga.

## Una vez

Estos seis pasos se hacen una sola vez, la primera vez que se instala el stack en una
máquina. **El orden importa**: no es el orden en que uno lo pensaría, es el único orden
que funciona. Seguilos de arriba hacia abajo, sin adelantarte.

### 1. Tailscale primero

```bash
tailscale up
tailscale status
```

`tailscale status` imprime el nombre de esta máquina en el tailnet apenas queda
conectada, sin necesidad de Funnel ni de que el stack esté levantado. Ese nombre arma la
URL pública: `https://<máquina>.<tailnet>.ts.net`.

Esto va **antes** que todo lo demás porque `backend/src/env.ts` valida `APP_ORIGIN` y
`OAUTH_REDIRECT_URI` como URLs al arrancar, y el proceso muere si faltan o no son URLs
válidas. Si se intentara levantar el stack primero y completar el `.env` después con la
URL de Funnel, el backend nunca llegaría a levantar — y sin backend sano no hay nada que
Funnel pueda publicar. La URL tiene que conocerse antes de encender nada.

### 2. Repo remoto y clone

Hoy el proyecto vive en un solo disco, sin remoto. Crear un repositorio **privado** en
GitHub (el catálogo trae precios y el código trae la lógica de auth; no tiene que ser
público) y empujar la rama que se va a desplegar:

```bash
git remote add origin https://github.com/<usuario>/RICKY_V1.git
git push -u origin HEAD
```

En el Debian, clonarlo:

```bash
git clone https://github.com/<usuario>/RICKY_V1.git
cd RICKY_V1
```

Por HTTPS, GitHub pide usuario y un **personal access token** (no la contraseña de la
cuenta) al clonar un repo privado. Si preferís SSH — `git@github.com:<usuario>/RICKY_V1.git` —
el Debian necesita una clave propia dada de alta en GitHub: generala con
`ssh-keygen -t ed25519` y pegá la pública en Settings → SSH and GPG keys.

### 3. Escribir el `.env`

En el repo ya clonado en el paso 2, copiar la plantilla y completarla con la URL de
Tailscale del paso 1:

```bash
cp .env.example .env
```

Editar `.env` con:

- `POSTGRES_PASSWORD`: generar con `openssl rand -base64 24`.
- `DATABASE_URL`: la misma contraseña, en la URL de conexión a `db`.
- `APP_ORIGIN`: `https://<máquina>.<tailnet>.ts.net`, sin barra final.
- `OAUTH_REDIRECT_URI`: `https://<máquina>.<tailnet>.ts.net/api/auth/google/callback`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: los mismos de desarrollo.
- `SESSION_COOKIE_SECRET`: uno nuevo (no el de desarrollo), con
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `BOOTSTRAP_ADMIN_EMAIL`: la cuenta de Google real del dueño — va a ser el primer
  administrador del panel.
- `SEED_INVITED_EMAIL`: opcional, un segundo correo que queda `PENDING` en el seed.

`.env` está en `.gitignore` de la raíz: nunca se commitea. Es distinto de
`backend/.env` y `frontend/.env.local`, que son de desarrollo y no se tocan.

### 4. Google Cloud Console

Dar de alta el `OAUTH_REDIRECT_URI` de arriba como URI de redirección autorizada en las
credenciales OAuth del proyecto de Google Cloud.

**Se agrega, no reemplaza**: el `http://localhost:3000/api/auth/google/callback` de
desarrollo se queda como está. Es el único paso de todo este procedimiento que ocurre
fuera del servidor. Si se lo olvida, el síntoma no es un error de la app: es
`redirect_uri_mismatch` de Google, al intentar loguearse.

### 5. Levantar

```bash
docker compose up -d --build
```

Construye las tres imágenes y levanta el stack. `db` espera a `pg_isready`; `backend`
corre `prisma migrate deploy` y, si hay `BOOTSTRAP_ADMIN_EMAIL`, siembra usuarios antes
de escuchar; `web` espera a que `backend` esté `healthy`. Los tres quedan con
`restart: unless-stopped`, así que un corte de luz no exige intervención manual.

La primera build tarda varios minutos (instala dependencias y compila Next). Las
siguientes son más rápidas por el cache de capas de Docker.

### 6. Publicar

```bash
tailscale funnel --bg 3000
tailscale funnel status
```

El segundo comando confirma la URL pública. Funnel necesita **HTTPS y Funnel
habilitados** en la consola de administración del tailnet (`login.tailscale.com/admin`)
— si no están habilitados para este tailnet, `tailscale funnel` falla o queda sin
publicar nada, y eso se resuelve en la consola, no en el Debian.

`NODE_ENV=production` (fijo en `compose.yaml`) es lo que activa `secure` en la cookie de
sesión del backend, así que el login solo funciona por HTTPS. Es exactamente lo que da
Funnel.

## Verificación

Correr en el Debian, en orden, después del paso 6:

```bash
docker compose ps
```

Esperado: los tres servicios — `db`, `backend`, `web` — en `(healthy)`. Los tres tienen
healthcheck propio en `compose.yaml`; si alguno queda en `starting` o reinicia en bucle,
`docker compose logs <servicio>` dice por qué (lo más probable en `backend` es
`migrate deploy` fallando; en `web`, no haber llegado a `backend`).

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000
```

Esperado: `200`.

```bash
docker compose exec web node -e "fetch('http://backend:4000/health').then(r=>r.text()).then(console.log)"
```

Esperado: `{"ok":true}`. Esta es la comprobación de que `web` alcanza a `backend` por la
red interna del compose. **No usar `wget` ni `curl` acá**: la imagen de `web` es
`node:22-slim` con el build standalone de Next, y no trae ninguno de los dos instalados;
`wget` falla con "executable file not found", un error que un operador apurado confunde
con "el backend está caído" cuando en realidad el backend está sano y el problema es que
la herramienta no existe en el contenedor. El `node -e` de arriba no depende de nada
externo: usa el `fetch` global de Node.

```bash
curl -s localhost:4000/health
```

Esperado: `curl: (7) Failed to connect... Connection refused` (el texto exacto varía
según el sistema). Confirma que `backend` **no** publica puerto al host: solo existe
dentro de la red del compose, tal como dice `compose.yaml`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/admin/vehicles
```

Esperado: `401`. Sin cookie de sesión, el panel no responde nada — ni siquiera para
confirmar que la ruta existe.

```bash
curl -s localhost:3000/api/vehicles | head
```

Esperado: JSON con los seis vehículos del catálogo público.

```bash
tailscale funnel status
```

Esperado: imprime la URL pública (`https://<máquina>.<tailnet>.ts.net`) y el puerto
`3000` como destino.

A mano, desde el celular (con datos, no con el wifi de casa, para probar que de verdad
sale a internet y no solo a la LAN):

- Abrir la URL de Funnel y ver el catálogo con los seis vehículos y sus fotos.
- Entrar a `/admin`: tiene que redirigir a `/login`.
- Loguearse con la cuenta de `BOOTSTRAP_ADMIN_EMAIL`.
- Confirmar que el usuario quedó `ACTIVE`:

```bash
docker compose exec -T db psql -U motors -d motors \
  -c 'select email, role, status from "User";'
```

- Repetir la comprobación de arriba (`/api/admin/vehicles` con `curl` y sin cookie, esta
  vez contra la URL pública) para confirmar que Funnel no cambia el resultado: sigue
  dando `401` y no filtra ningún costo.
- En el panel, recorrer consultas y detailing y confirmar que se ven todos los estados
  de cada uno (`new`/`contacted`/`negotiating`/`closed`/`discarded` en consultas;
  `pending`/`confirmed`/`in_progress`/`completed`/`cancelled` en detailing).

El trabajo no está terminado hasta que toda esta lista pasa en el servidor real, no solo
en local.

## Operación

### Cada actualización

```bash
git pull
docker compose up -d --build
```

Reconstruye solo lo que cambió (Docker cachea capas) y reinicia los servicios afectados
sin tocar el volumen de datos.

### Respaldo

```bash
docker compose exec -T db pg_dump -U motors motors > respaldo.sql
```

**Advertencia honesta:** hoy esto respalda usuarios y sesiones, que es todo lo que vive
en Postgres. El stock, las consultas, los turnos y las solicitudes de venta siguen en el
store en memoria del frontend (ver "Limitaciones conocidas" abajo) y no están en este
respaldo porque no sobreviven ni siquiera a un reinicio del contenedor.

### Mudanza al dominio de la empresa

El `compose.yaml` no cambia. Los pasos son:

1. Apagar Funnel: `tailscale funnel reset` (da de baja toda la configuración de Funnel
   en esta máquina).
2. Poner un proxy (nginx, Caddy, lo que ya use la empresa) adelante de
   `127.0.0.1:3000`, con el certificado del dominio real.
3. Cambiar `APP_ORIGIN` y `OAUTH_REDIRECT_URI` en `.env` al dominio nuevo.
4. Dar de alta el nuevo redirect URI en Google Cloud Console (se agrega, no reemplaza).
5. `docker compose up -d` para que `backend` relea el `.env` con los valores nuevos.

### Nginx Proxy Manager

**NPM no participa en este despliegue**, ni antes ni después de la mudanza. El NPM del
lab enruta en la LAN, y un origen HTTP en la LAN no puede sostener el login: la cookie
de sesión sale `secure` en producción (`backend/src/auth/routes.ts`) y Google no acepta
redirect URIs `http://` fuera de `localhost`. Meter NPM en el medio significaría dos
orígenes con comportamiento distinto del panel — uno que loguea y uno que no.

Si en algún momento se corre un nginx propio en el Debian (por ejemplo para la mudanza
de dominio de arriba) y el lab también tiene NPM corriendo, **cuidado con el puerto**:
los dos van a pelear por 80 y 443 en el mismo host. Definir de antemano cuál de los dos
los tiene.

## Limitaciones conocidas

1. **El store del panel vive en memoria.** Todo lo que el dueño cargue desde
   `/admin` — vehículos nuevos, cambios de estado en consultas y turnos — se pierde en
   cada reinicio del contenedor de `web`. Solo usuarios y sesiones están en Postgres y
   sobreviven. Es una deuda conocida, fuera del alcance de este trabajo a propósito.
2. **No hay forma de subir fotos desde el panel.** Las 45 fotos de los seis vehículos
   reales están versionadas en el repo (`frontend/public/vehiculos/`). Un vehículo nuevo
   cargado desde el panel va a mostrar el marcador de bandas diagonales, no una foto,
   porque no existe storage para imágenes subidas.
3. **Los costos están en cero a propósito.** `purchasePrice` y `expenses` de los seis
   vehículos reales son `0` porque no tenemos los costos reales de la agencia; el panel
   muestra "sin cargar" en la columna de margen en vez de inventar un número.
4. **Next está en `15.5.25`, que cierra los tres advisories críticos de `15.5.4`.**
   Eran tres RCE (protocolo flight de React, Image Optimization vía AVIF, y uno de
   servers Windows que no aplica en Debian) más varios bypass de middleware en App
   Router, que es justo lo que protege `/admin`. Fue un bump de patch dentro de 15.5.x.
   Lo que queda en `npm audit` después del bump son dos High transitivos de `next` que
   no cierra esta versión — `postcss` (lectura de archivos vía `sourceMappingURL`, que
   solo corre en build, no en el server expuesto) y `sharp` (libvips/libheif, que usa la
   Image Optimization API) — y un Moderate en `next` por el mismo `postcss`. Cerrarlos
   pide `next@16`, que es un major y es una decisión aparte.
