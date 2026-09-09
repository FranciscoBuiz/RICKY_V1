# Despliegue de la demo en el home lab — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poner RICKY_V1 en el Debian del home lab, accesible desde internet por Tailscale Funnel, con `/api/*` autorizado y el catálogo cargado con los seis vehículos reales de la agencia y sus 45 fotos.

**Architecture:** Cuatro fases en orden forzado. Primero se cierra la autorización de `/api/*`, que hoy sirve costos internos y datos de contacto sin sesión. Después entran las fotos y los datos reales al modelo de dominio, y la semilla del panel cubre todos los estados. Recién al final se empaqueta en tres contenedores (`web`, `backend`, `db`) donde solo `web` publica puerto, y se escribe el `DEPLOY.md`.

**Tech Stack:** Next.js 15.5.4 (App Router, React 19), Fastify 5.12.3 + tsx, Prisma 7.10.0, PostgreSQL 17, Docker Compose, Tailscale Funnel, Vitest 4.1.11.

**Spec:** `docs/superpowers/specs/2026-09-09-despliegue-home-lab-design.md`

## Global Constraints

- **Versiones exactas en `package.json`.** `npm install X` escribe `^X`; hay que corregirlo a la versión exacta.
- **Español rioplatense** en toda la UI (voseo: "vendé", "reservá") y en los comentarios del código.
- **TypeScript strict.** `npm run typecheck` tiene que quedar limpio antes de cada commit, en el paquete que se tocó.
- **Sin librerías de UI de terceros.** Estilos con CSS variables y `style` inline, como el resto del proyecto.
- **Los ids de los vehículos no se tocan nunca:** `etios17`, `hilux18`, `palio15`, `fox17`, `etios16`, `pcx26`. Ya están compartidos por WhatsApp.
- **No se inventa contenido factual** (Principio 2 de PRODUCT.md). Si no hay dato, el campo queda vacío y la UI omite la fila.
- **Comentarios que expliquen el porqué, no el qué.** El código del proyecto documenta decisiones y trampas, no repite lo que la línea ya dice.
- El proyecto original está en `C:\Users\buizf\Desktop\Nueva carpeta` y es solo **fuente de datos**: no se modifica.

---

## Fase 1 — Autorización de `/api/*`

### Task 1: Runner de tests y helper de sesión

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/lib/session.ts`
- Test: `frontend/src/lib/session.test.ts`

**Interfaces:**
- Consumes: `GET {BACKEND_URL}/auth/me` del backend, que responde `200 { user: { id, name, email, role, status } }` con sesión válida y `401 { error }` sin ella.
- Produces:
  - `getSession(request: Request): Promise<PanelUser | null>`
  - `sinSesion(): NextResponse` — respuesta `401` con la forma `{ error }` que ya consume `frontend/src/lib/api.ts`.

- [ ] **Step 1: Instalar vitest con versión exacta**

```bash
cd frontend
npm install --save-dev vitest@4.1.11
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
```

Comprobar que `package.json` quedó con `"vitest": "4.1.11"` y no `"^4.1.11"`. Si tiene el `^`, corregirlo a mano (Global Constraints).

- [ ] **Step 2: Configurar vitest**

`frontend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    /* El alias `@/` lo resuelve el compilador de Next, que no participa acá.
       Sin esto, cualquier import de `@/lib/...` falla en el runner. */
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Escribir el test que falla**

`frontend/src/lib/session.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSession } from '@/lib/session';

function pedido(cookie?: string): Request {
  return new Request('http://localhost:3000/api/admin/vehicles', {
    headers: cookie ? { cookie } : {},
  });
}

const USUARIO = {
  id: 'u-1',
  name: 'Fran',
  email: 'fran@example.com',
  role: 'Administrador',
  status: 'active',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getSession', () => {
  it('devuelve el usuario cuando el backend valida la cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ user: USUARIO }), { status: 200 })),
    );

    expect(await getSession(pedido('motors_session=token'))).toEqual(USUARIO);
  });

  it('devuelve null cuando el backend responde 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'Necesitás iniciar sesión.' }), { status: 401 })),
    );

    expect(await getSession(pedido('motors_session=vencido'))).toBeNull();
  });

  it('no llama al backend si no vino ninguna cookie', async () => {
    const espia = vi.fn();
    vi.stubGlobal('fetch', espia);

    expect(await getSession(pedido())).toBeNull();
    expect(espia).not.toHaveBeenCalled();
  });

  it('devuelve null si el backend está caído, en vez de propagar el error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    expect(await getSession(pedido('motors_session=token'))).toBeNull();
  });

  it('reenvía la cookie entrante tal cual', async () => {
    const espia = vi.fn(async () => new Response(JSON.stringify({ user: USUARIO }), { status: 200 }));
    vi.stubGlobal('fetch', espia);

    await getSession(pedido('motors_session=abc123'));

    const [, init] = espia.mock.calls[0] as [URL, RequestInit];
    expect((init.headers as Record<string, string>).cookie).toBe('motors_session=abc123');
  });
});
```

- [ ] **Step 4: Correr el test y verificar que falla**

Run: `cd frontend && npm test`
Expected: FAIL — `Failed to resolve import "@/lib/session"`.

- [ ] **Step 5: Escribir el helper**

`frontend/src/lib/session.ts`:

```ts
import { NextResponse } from 'next/server';
import type { PanelUser } from '@/types';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';

/**
 * Traduce la cookie entrante a un usuario preguntándole al backend.
 *
 * No valida el token acá a propósito: el backend es el único que sabe si sigue
 * vivo, si fue revocado y qué rol tiene hoy. Replicar esa lógica en Next daría
 * dos fuentes de verdad que se desincronizan en la primera revocación.
 */
export async function getSession(request: Request): Promise<PanelUser | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;

  try {
    const respuesta = await fetch(new URL('/auth/me', BACKEND), {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!respuesta.ok) return null;

    const cuerpo = (await respuesta.json()) as { user?: PanelUser };
    return cuerpo.user ?? null;
  } catch {
    /* Backend caído o inalcanzable. Sin sesión comprobable no se autoriza:
       fallar abierto acá expondría los costos internos justo cuando el sistema
       está en su peor momento. */
    return null;
  }
}

/** Misma forma `{ error }` que consume `frontend/src/lib/api.ts`. */
export function sinSesion(): NextResponse {
  return NextResponse.json({ error: 'Necesitás iniciar sesión.' }, { status: 401 });
}
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `cd frontend && npm test`
Expected: PASS — 5 tests.

- [ ] **Step 7: Typecheck y commit**

```bash
cd frontend && npm run typecheck
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/lib/session.ts frontend/src/lib/session.test.ts
git commit -m "feat(frontend): helper de sesion contra el backend, con vitest"
```

---

### Task 2: Cerrar `/api/admin/*`

**Files:**
- Modify: `frontend/src/app/api/admin/dashboard/route.ts`
- Modify: `frontend/src/app/api/admin/vehicles/route.ts`
- Modify: `frontend/src/app/api/admin/vehicles/[id]/route.ts`
- Test: `frontend/src/app/api/admin/admin-auth.test.ts`

**Interfaces:**
- Consumes: `getSession`, `sinSesion` de `@/lib/session` (Task 1).
- Produces: nada nuevo. A partir de acá, todo `/api/admin/*` responde `401` sin sesión.

- [ ] **Step 1: Escribir el test que falla**

`frontend/src/app/api/admin/admin-auth.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Cada ruta se importa dentro del test y no arriba: el helper de sesión se
   mockea antes, y un import estático lo evaluaría con el módulo real. */
vi.mock('@/lib/session', async () => {
  const real = await vi.importActual<typeof import('@/lib/session')>('@/lib/session');
  return { ...real, getSession: vi.fn() };
});

const { getSession } = await import('@/lib/session');
const mockGetSession = vi.mocked(getSession);

const USUARIO = {
  id: 'u-1',
  name: 'Fran',
  email: 'fran@example.com',
  role: 'Administrador' as const,
  status: 'active' as const,
};

beforeEach(() => {
  mockGetSession.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

describe('GET /api/admin/vehicles', () => {
  it('responde 401 sin sesión', async () => {
    mockGetSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/vehicles/route');

    const respuesta = await GET(new Request('http://localhost:3000/api/admin/vehicles'));

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual({ error: 'Necesitás iniciar sesión.' });
  });

  it('responde 200 con sesión', async () => {
    mockGetSession.mockResolvedValue(USUARIO);
    const { GET } = await import('@/app/api/admin/vehicles/route');

    const respuesta = await GET(new Request('http://localhost:3000/api/admin/vehicles'));

    expect(respuesta.status).toBe(200);
  });

  it('no filtra purchasePrice ni expenses en la respuesta 401', async () => {
    mockGetSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/vehicles/route');

    const cuerpo = await (await GET(new Request('http://localhost:3000/api/admin/vehicles'))).text();

    expect(cuerpo).not.toContain('purchasePrice');
    expect(cuerpo).not.toContain('expenses');
  });
});

describe('GET /api/admin/dashboard', () => {
  it('responde 401 sin sesión', async () => {
    mockGetSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/dashboard/route');

    expect((await GET(new Request('http://localhost:3000/api/admin/dashboard'))).status).toBe(401);
  });
});

describe('POST /api/admin/vehicles', () => {
  it('responde 401 sin sesión y no crea nada', async () => {
    mockGetSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/admin/vehicles/route');

    const respuesta = await POST(
      new Request('http://localhost:3000/api/admin/vehicles', {
        method: 'POST',
        body: JSON.stringify({ brand: 'Intruso', model: 'X' }),
      }),
    );

    expect(respuesta.status).toBe(401);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npm test -- admin-auth`
Expected: FAIL — los tests de `401` reciben `200`.

- [ ] **Step 3: Proteger `/api/admin/dashboard`**

En `frontend/src/app/api/admin/dashboard/route.ts`, agregar el import y cambiar la firma de `GET`, que hoy no recibe argumentos:

```ts
import { NextResponse } from 'next/server';
import { seedDashboardLeads, seedTodayAppointments } from '@/server/data/crm';
import { getSession, sinSesion } from '@/lib/session';
import { dashboardPayload } from '@/server/store';

/**
 * Todo lo que necesita el dashboard en una sola llamada: alertas, agenda del
 * día, leads y métricas de negocio.
 */
export async function GET(request: Request) {
  if (!(await getSession(request))) return sinSesion();

  return NextResponse.json({
    ...dashboardPayload(),
    todayAppointments: seedTodayAppointments,
    leads: seedDashboardLeads,
  });
}
```

- [ ] **Step 4: Proteger `/api/admin/vehicles`**

En `frontend/src/app/api/admin/vehicles/route.ts`, agregar la guarda como primera línea de `GET` y de `POST`:

```ts
import { NextResponse } from 'next/server';
import { getSession, sinSesion } from '@/lib/session';
import { createVehicle, listVehicles, stockSummary, type VehicleInput } from '@/server/store';

/** Stock completo del panel, con precio de compra, gastos y margen. */
export async function GET(request: Request) {
  if (!(await getSession(request))) return sinSesion();

  const params = new URL(request.url).searchParams;
  const vehicles = listVehicles({
    status: params.get('status') ?? undefined,
    search: params.get('search') ?? undefined,
  });
  return NextResponse.json({ vehicles, total: vehicles.length, stock: stockSummary() });
}

export async function POST(request: Request) {
  if (!(await getSession(request))) return sinSesion();

  const body = (await request.json().catch(() => null)) as VehicleInput | null;
  if (!body || !body.brand || !body.model) {
    return NextResponse.json({ error: 'Marca y modelo son obligatorios' }, { status: 400 });
  }
  return NextResponse.json({ vehicle: createVehicle(body) }, { status: 201 });
}
```

- [ ] **Step 5: Proteger `/api/admin/vehicles/[id]`**

Leer `frontend/src/app/api/admin/vehicles/[id]/route.ts` y agregar la misma guarda como primera línea de **cada** handler exportado (`GET`, `PATCH`, `DELETE` — los que existan), sin cambiar nada más:

```ts
if (!(await getSession(request))) return sinSesion();
```

Agregar el import `import { getSession, sinSesion } from '@/lib/session';`.

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `cd frontend && npm test`
Expected: PASS — los 5 de `session.test.ts` más los 5 de `admin-auth.test.ts`.

- [ ] **Step 7: Typecheck y commit**

```bash
cd frontend && npm run typecheck
git add frontend/src/app/api/admin frontend/src/app/api/admin/admin-auth.test.ts
git commit -m "fix(frontend): /api/admin/* exigia ninguna sesion y servia costos internos"
```

---

### Task 3: Cerrar consultas, turnos y configuración

**Files:**
- Modify: `frontend/src/app/api/leads/route.ts`
- Modify: `frontend/src/app/api/leads/[id]/route.ts`
- Modify: `frontend/src/app/api/appointments/route.ts`
- Modify: `frontend/src/app/api/appointments/[id]/route.ts`
- Modify: `frontend/src/app/api/settings/route.ts`
- Modify: `frontend/src/app/api/settings/notifications/route.ts`
- Test: `frontend/src/app/api/reparto-publico.test.ts`

**Interfaces:**
- Consumes: `getSession`, `sinSesion` de `@/lib/session` (Task 1).
- Produces: el reparto público/privado completo, fijado por un test de tabla.

**El reparto es el contrato.** `GET` de leads y appointments devuelve datos de contacto de personas y pasa a exigir sesión. Los `POST` siguen públicos: son el formulario de contacto, la reserva de turno y vender-mi-auto, que según el Principio 1 de PRODUCT.md son el punto del producto.

| Público | Requiere sesión |
|---|---|
| `POST /api/leads` | `GET /api/leads` |
| `POST /api/appointments` | `PATCH /api/leads/[id]` |
| `POST /api/sell-requests` | `GET /api/appointments` |
| `GET /api/settings` | `PATCH /api/appointments/[id]` |
| `GET /api/vehicles`, `/api/vehicles/[id]` | `PATCH /api/settings` |
| `GET /api/services` | `/api/settings/notifications` (todos los métodos) |
| `GET /api/appointments/availability` | |

- [ ] **Step 1: Escribir el test de tabla que falla**

`frontend/src/app/api/reparto-publico.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', async () => {
  const real = await vi.importActual<typeof import('@/lib/session')>('@/lib/session');
  return { ...real, getSession: vi.fn() };
});

const { getSession } = await import('@/lib/session');
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(null);
});

/* Cada fila es una decisión del spec, no un detalle de implementación: si
   alguien abre un GET privado o cierra un POST público, este test lo dice. */
const PRIVADOS: { nombre: string; modulo: string; metodo: 'GET' | 'PATCH' }[] = [
  { nombre: 'GET /api/leads', modulo: '@/app/api/leads/route', metodo: 'GET' },
  { nombre: 'GET /api/appointments', modulo: '@/app/api/appointments/route', metodo: 'GET' },
  { nombre: 'PATCH /api/settings', modulo: '@/app/api/settings/route', metodo: 'PATCH' },
];

const PUBLICOS: { nombre: string; modulo: string; metodo: 'GET' }[] = [
  { nombre: 'GET /api/vehicles', modulo: '@/app/api/vehicles/route', metodo: 'GET' },
  { nombre: 'GET /api/services', modulo: '@/app/api/services/route', metodo: 'GET' },
  { nombre: 'GET /api/settings', modulo: '@/app/api/settings/route', metodo: 'GET' },
  {
    nombre: 'GET /api/appointments/availability',
    modulo: '@/app/api/appointments/availability/route',
    metodo: 'GET',
  },
];

describe('rutas que exigen sesión', () => {
  it.each(PRIVADOS)('$nombre responde 401 sin sesión', async ({ modulo, metodo }) => {
    const rutas = (await import(modulo)) as Record<string, (r: Request) => Promise<Response>>;
    const pedido = new Request('http://localhost:3000/api/x', {
      method: metodo,
      body: metodo === 'PATCH' ? JSON.stringify({}) : undefined,
    });

    expect((await rutas[metodo](pedido)).status).toBe(401);
  });
});

describe('rutas que siguen públicas', () => {
  it.each(PUBLICOS)('$nombre no responde 401 sin sesión', async ({ modulo, metodo }) => {
    const rutas = (await import(modulo)) as Record<string, (r: Request) => Promise<Response>>;
    const pedido = new Request('http://localhost:3000/api/x');

    expect((await rutas[metodo](pedido)).status).not.toBe(401);
  });

  it('POST /api/leads sigue aceptando una consulta anónima', async () => {
    const { POST } = await import('@/app/api/leads/route');

    const respuesta = await POST(
      new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify({ name: 'Visitante', phone: '2235550000' }),
      }),
    );

    expect(respuesta.status).toBe(201);
  });

  it('POST /api/appointments sigue aceptando una reserva anónima', async () => {
    const { POST } = await import('@/app/api/appointments/route');

    const respuesta = await POST(
      new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          client: 'Visitante',
          service: 'Lavado premium',
          date: '2027-01-15',
        }),
      }),
    );

    expect([200, 201, 409]).toContain(respuesta.status);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npm test -- reparto-publico`
Expected: FAIL — las tres rutas privadas responden `200`.

- [ ] **Step 3: Cerrar los `GET` de leads y appointments**

En `frontend/src/app/api/leads/route.ts`, el `GET` hoy no recibe argumentos. Cambiarlo:

```ts
import { NextResponse } from 'next/server';
import { getSession, sinSesion } from '@/lib/session';
import { createLead, listLeads, type LeadInput } from '@/server/store';

/** Listado del panel: incluye teléfono y email de cada persona que consultó. */
export async function GET(request: Request) {
  if (!(await getSession(request))) return sinSesion();
  return NextResponse.json({ leads: listLeads() });
}
```

El `POST` del mismo archivo **no se toca**.

En `frontend/src/app/api/appointments/route.ts`, el mismo cambio sobre `GET`:

```ts
export async function GET(request: Request) {
  if (!(await getSession(request))) return sinSesion();
  return NextResponse.json({ appointments: listAppointments() });
}
```

El `POST` **no se toca**.

- [ ] **Step 4: Cerrar los `PATCH` de `[id]` y de settings**

En `frontend/src/app/api/leads/[id]/route.ts` y `frontend/src/app/api/appointments/[id]/route.ts`, agregar como primera línea de cada handler:

```ts
if (!(await getSession(request))) return sinSesion();
```

En `frontend/src/app/api/settings/route.ts`, agregarla **solo al `PATCH`**. El `GET` queda público: el sitio muestra dirección y horarios de atención.

En `frontend/src/app/api/settings/notifications/route.ts`, agregarla a **todos** los handlers: las preferencias de notificación son del panel entero.

Agregar `import { getSession, sinSesion } from '@/lib/session';` en cada archivo.

- [ ] **Step 5: Correr toda la suite**

Run: `cd frontend && npm test`
Expected: PASS — `session`, `admin-auth` y `reparto-publico`.

- [ ] **Step 6: Verificar a mano que el sitio público sigue entero**

```bash
cd frontend && npm run dev
```

En otra terminal, sin ninguna cookie:

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/vehicles        # 200
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/admin/vehicles  # 401
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/leads           # 401
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/settings        # 200
```

Abrir `/contacto` en el navegador y mandar una consulta: tiene que entrar sin sesión.

**Antes de relanzar el dev server, comprobar que no quedó otro huérfano** (`docs/ESTADO.md`, "Trampa del entorno que costó una hora"): dos `next dev` sobre el mismo `.next` dejan todas las páginas sin estilos.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/api
git commit -m "fix(frontend): consultas, turnos y configuracion exigen sesion"
```

---

## Fase 2 — Vehículos reales y fotos

### Task 4: El modelo acepta fotos, motos y datos faltantes

**Files:**
- Modify: `frontend/src/types/index.ts`
- Test: `frontend/src/types/vehicle-model.test.ts`

**Interfaces:**
- Produces:
  - `interface VehicleImage { src: string; alt: string }`
  - `Vehicle.images: VehicleImage[]`
  - `Vehicle.bodyType` suma `'Moto'`; `Vehicle.fuel` suma `'Nafta/GNC'`
  - `Vehicle.engine`, `.traction`, `.doors`, `.description` pasan a opcionales

- [ ] **Step 1: Escribir el test que falla**

`frontend/src/types/vehicle-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Vehicle } from '@/types';

/* Es un test de tipos tanto como de valores: si `images` o `'Moto'` no existen,
   no compila, y `npm run typecheck` lo marca antes de que corra el runner. */
describe('modelo Vehicle', () => {
  it('acepta una moto 0 km sin motor, tracción, puertas ni descripción', () => {
    const moto: Vehicle = {
      id: 'pcx26',
      brand: 'Honda',
      model: 'PCX',
      version: 'Deluxe',
      year: 2026,
      mileage: 0,
      fuel: 'Nafta',
      transmission: 'Automática',
      bodyType: 'Moto',
      price: 7500,
      status: 'available',
      featured: false,
      color: 'Azul',
      location: 'Mar del Plata',
      purchasePrice: 0,
      expenses: 0,
      images: [{ src: '/vehiculos/pcx26/01.jpg', alt: 'Honda PCX Deluxe 0 km azul' }],
    };

    expect(moto.engine).toBeUndefined();
    expect(moto.images).toHaveLength(1);
  });

  it('acepta Nafta/GNC como combustible', () => {
    const combustible: Vehicle['fuel'] = 'Nafta/GNC';
    expect(combustible).toBe('Nafta/GNC');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npm test -- vehicle-model`
Expected: FAIL — `'Moto'` no es asignable a `bodyType`, y `images` no existe en `Vehicle`.

- [ ] **Step 3: Cambiar el modelo**

En `frontend/src/types/index.ts`, reemplazar la interfaz `Vehicle` (líneas 3-24) por:

```ts
/** Una foto del vehículo. `src` es una ruta pública servida desde `public/`. */
export interface VehicleImage {
  src: string;
  alt: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  mileage: number;
  fuel: 'Nafta' | 'Diesel' | 'Nafta/GNC';
  transmission: 'Manual' | 'Automática';
  bodyType: 'Sedán' | 'SUV' | 'Hatchback' | 'Pick-up' | 'Moto';
  /** En dólares: es la moneda en la que la agencia publica. */
  price: number;
  status: VehicleStatus;
  featured: boolean;
  color: string;
  location: string;
  /**
   * Vacío mientras el vehículo no tenga fotos cargadas. La UI cae al marcador
   * de bandas en ese caso: es lo que va a ver cualquier vehículo que el panel
   * dé de alta, porque todavía no hay forma de subir fotos.
   */
  images: VehicleImage[];
  /* Opcionales: los seis vehículos reales no traen estos datos y el Principio 2
     de PRODUCT.md prohíbe rellenarlos. La ficha omite la fila que falta. */
  engine?: string;
  traction?: string;
  doors?: number;
  description?: string;
  /** Interno — sólo se expone en el panel admin. */
  purchasePrice: number;
  expenses: number;
}
```

- [ ] **Step 4: Correr el typecheck para ver qué se rompió**

Run: `cd frontend && npm run typecheck`
Expected: FAIL — `seedVehicles` en `src/server/data/vehicles.ts` no tiene `images`, y todo consumidor de `vehicle.description` / `.engine` / `.doors` / `.traction` ahora recibe `undefined` posible.

Anotar la lista de archivos que salen en el error: son los que la Task 7, 8 y 9 tienen que tocar.

- [ ] **Step 5: Dejar la semilla existente compilando**

Agregar `images: []` a cada uno de los objetos de `seedVehicles` en `frontend/src/server/data/vehicles.ts`. No se toca nada más de esa semilla: la Task 5 la reemplaza entera.

- [ ] **Step 6: Correr test y typecheck**

Run: `cd frontend && npm test && npm run typecheck`
Expected: los tests pasan. El typecheck puede seguir marcando los consumidores de los campos ahora opcionales — se arreglan en las Tasks 7-9. Si marca algo **fuera** de `VehicleCard.tsx`, `VehiculoDetalleView.tsx` y `AdminVehiculosView.tsx`, anotarlo y arreglarlo acá.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/types/vehicle-model.test.ts frontend/src/server/data/vehicles.ts
git commit -m "feat(frontend): el modelo de vehiculo acepta fotos, motos y datos ausentes"
```

---

### Task 5: Las 45 fotos y los seis vehículos reales

**Files:**
- Create: `frontend/public/vehiculos/{etios17,hilux18,palio15,fox17,etios16,pcx26}/NN.jpg` (45 archivos)
- Modify: `frontend/src/server/data/vehicles.ts`
- Test: `frontend/src/server/data/vehicles.test.ts`

**Interfaces:**
- Consumes: `Vehicle`, `VehicleImage` de `@/types` (Task 4).
- Produces: `seedVehicles` con los seis vehículos reales.

- [ ] **Step 1: Copiar las fotos**

Desde la raíz del repo, en PowerShell:

```powershell
$origen = "C:\Users\buizf\Desktop\Nueva carpeta\public\vehiculos"
$destino = "C:\Users\buizf\Desktop\RICKY_V1\frontend\public\vehiculos"
Copy-Item -Path $origen -Destination $destino -Recurse
```

Verificar que son 45 archivos y 12 MB:

```powershell
(Get-ChildItem $destino -Recurse -Filter *.jpg).Count
"{0:N1} MB" -f ((Get-ChildItem $destino -Recurse | Measure-Object Length -Sum).Sum / 1MB)
```

Expected: `45` y `12,0 MB` aproximadamente. Reparto por carpeta: `etios17` 10, `hilux18` 9, `palio15` 8, `fox17` 7, `etios16` 6, `pcx26` 5.

- [ ] **Step 2: Escribir el test que falla**

`frontend/src/server/data/vehicles.test.ts`:

```ts
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { seedVehicles } from '@/server/data/vehicles';

const FOTOS_POR_ID: Record<string, number> = {
  etios17: 10,
  hilux18: 9,
  palio15: 8,
  fox17: 7,
  etios16: 6,
  pcx26: 5,
};

describe('seedVehicles', () => {
  it('tiene los seis vehículos reales, con los ids que ya circularon por WhatsApp', () => {
    expect(seedVehicles.map((v) => v.id).sort()).toEqual(
      ['etios16', 'etios17', 'fox17', 'hilux18', 'palio15', 'pcx26'].sort(),
    );
  });

  it('le da a cada vehículo la cantidad de fotos que tiene en disco', () => {
    for (const vehiculo of seedVehicles) {
      expect(vehiculo.images).toHaveLength(FOTOS_POR_ID[vehiculo.id]);
    }
  });

  it('apunta a archivos que existen', () => {
    for (const vehiculo of seedVehicles) {
      for (const foto of vehiculo.images) {
        const ruta = path.join(process.cwd(), 'public', foto.src);
        expect(existsSync(ruta), `falta ${foto.src}`).toBe(true);
      }
    }
  });

  it('deja los costos internos en cero: no los tenemos y no se inventan', () => {
    for (const vehiculo of seedVehicles) {
      expect(vehiculo.purchasePrice).toBe(0);
      expect(vehiculo.expenses).toBe(0);
    }
  });

  it('no marca ningún vehículo real como reservado ni vendido', () => {
    for (const vehiculo of seedVehicles) {
      expect(vehiculo.status).toBe('available');
    }
  });

  it('destaca solo el Etios 2017, como el catálogo original', () => {
    expect(seedVehicles.filter((v) => v.featured).map((v) => v.id)).toEqual(['etios17']);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd frontend && npm test -- vehicles`
Expected: FAIL — los ids son los del prototipo (`v-corolla-xei`, …).

- [ ] **Step 4: Reemplazar la semilla**

`frontend/src/server/data/vehicles.ts` — reemplazar `seedVehicles` entero (las opciones de filtro que están más abajo en el archivo se revisan en el Step 5):

```ts
import type { Vehicle, VehicleImage } from '@/types';

/**
 * Las fotos viven en `public/vehiculos/<id>/NN.jpg`, numeradas desde 01 en el
 * orden en que se muestran. El alt nombra el vehículo y nada más: nadie rotuló
 * qué muestra cada toma, y un alt que afirma "interior" sobre una foto del baúl
 * es peor que no tenerlo.
 */
function fotos(id: string, cantidad: number, alt: string): VehicleImage[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    src: `/vehiculos/${id}/${String(i + 1).padStart(2, '0')}.jpg`,
    alt: i === 0 ? alt : `${alt}, foto ${i + 1}`,
  }));
}

/**
 * Los seis vehículos reales de la agencia. Los ids son los que ya se
 * compartieron por WhatsApp: no se tocan nunca.
 *
 * `price` está en dólares, que es como la agencia publica. `purchasePrice` y
 * `expenses` quedan en 0 porque son costos reales que no tenemos, y el panel
 * muestra "sin cargar" en lugar de calcular un margen falso.
 */
export const seedVehicles: Vehicle[] = [
  {
    id: 'etios17',
    brand: 'Toyota',
    model: 'Etios',
    version: 'XLS',
    year: 2017,
    mileage: 142000,
    fuel: 'Nafta/GNC',
    transmission: 'Manual',
    bodyType: 'Sedán',
    price: 12900,
    status: 'available',
    featured: true,
    color: 'Blanco',
    location: 'Mar del Plata',
    images: fotos('etios17', 10, 'Toyota Etios XLS 2017 blanco'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'hilux18',
    brand: 'Toyota',
    model: 'Hilux SW4',
    version: 'SRX',
    year: 2018,
    mileage: 191860,
    fuel: 'Diesel',
    transmission: 'Automática',
    bodyType: 'SUV',
    price: 38000,
    status: 'available',
    featured: false,
    color: 'Blanco perla',
    location: 'Mar del Plata',
    images: fotos('hilux18', 9, 'Toyota Hilux SW4 SRX 2018 blanco perla'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'palio15',
    brand: 'Fiat',
    model: 'Palio',
    version: 'Essence 1.6 16v',
    year: 2015,
    mileage: 106000,
    fuel: 'Nafta',
    transmission: 'Manual',
    bodyType: 'Hatchback',
    price: 9500,
    status: 'available',
    featured: false,
    color: 'Blanco',
    location: 'Mar del Plata',
    images: fotos('palio15', 8, 'Fiat Palio Essence 1.6 16v 2015 blanco'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'fox17',
    brand: 'Volkswagen',
    model: 'Fox',
    version: 'Comfort',
    year: 2017,
    mileage: 138000,
    fuel: 'Nafta',
    transmission: 'Manual',
    bodyType: 'Hatchback',
    price: 10200,
    status: 'available',
    featured: false,
    color: 'Negro',
    location: 'Mar del Plata',
    images: fotos('fox17', 7, 'Volkswagen Fox Comfort 2017 negro'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'etios16',
    brand: 'Toyota',
    model: 'Etios',
    version: 'XLS',
    year: 2016,
    mileage: 101000,
    fuel: 'Nafta',
    transmission: 'Manual',
    bodyType: 'Sedán',
    price: 12500,
    status: 'available',
    featured: false,
    color: 'Blanco',
    location: 'Mar del Plata',
    images: fotos('etios16', 6, 'Toyota Etios XLS 2016 blanco'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'pcx26',
    brand: 'Honda',
    model: 'PCX',
    version: 'Deluxe',
    year: 2026,
    /* 0 km. El badge "0 km" se deriva de acá y no de un estado aparte: el
       kilometraje y la disponibilidad son dos cosas distintas. */
    mileage: 0,
    fuel: 'Nafta',
    transmission: 'Automática',
    bodyType: 'Moto',
    price: 7500,
    status: 'available',
    featured: false,
    color: 'Azul',
    location: 'Mar del Plata',
    images: fotos('pcx26', 5, 'Honda PCX Deluxe 0 km azul'),
    purchasePrice: 0,
    expenses: 0,
  },
];
```

- [ ] **Step 5: Revisar las opciones de filtro del mismo archivo**

`frontend/src/server/data/vehicles.ts` exporta también `brandOptions`, `bodyTypeOptions`, `fuelOptions` y `transmissionOptions`, que consume `/api/vehicles`. Revisar cada una y dejarla consistente con los seis vehículos: las marcas pasan a ser Toyota, Fiat, Volkswagen y Honda; `bodyTypeOptions` suma `'Moto'`; `fuelOptions` suma `'Nafta/GNC'`.

Si esas listas se derivan de `seedVehicles`, no hay nada que hacer. Si están escritas a mano, actualizarlas.

- [ ] **Step 6: Correr los tests**

Run: `cd frontend && npm test -- vehicles`
Expected: PASS — 6 tests.

- [ ] **Step 7: Commit**

```bash
git add frontend/public/vehiculos frontend/src/server/data/vehicles.ts frontend/src/server/data/vehicles.test.ts
git commit -m "feat(frontend): los seis vehiculos reales de la agencia con sus 45 fotos"
```

---

### Task 6: Precios en dólares

**Files:**
- Modify: `frontend/src/lib/format.ts`
- Modify: `frontend/src/lib/design.ts`
- Modify: `frontend/src/app/catalogo/CatalogoView.tsx:48`
- Modify: `frontend/src/components/site/QuickSearch.tsx:17`
- Test: `frontend/src/lib/format.test.ts`

**Interfaces:**
- Produces: `money(value: number): string` devuelve `"US$ 12.900"`. `PRICE_STEPS` pasa a `@/lib/design` como fuente única.

- [ ] **Step 1: Escribir el test que falla**

`frontend/src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { money } from '@/lib/format';
import { PRICE_STEPS } from '@/lib/design';
import { seedVehicles } from '@/server/data/vehicles';

describe('money', () => {
  it('formatea en dólares, que es como publica la agencia', () => {
    expect(money(12900)).toBe('US$ 12.900');
  });

  it('formatea el vehículo más caro sin notación rara', () => {
    expect(money(38000)).toBe('US$ 38.000');
  });
});

describe('PRICE_STEPS', () => {
  it('deja al menos un vehículo bajo el escalón más bajo', () => {
    const masBarato = Math.min(...seedVehicles.map((v) => v.price));
    expect(masBarato).toBeLessThanOrEqual(PRICE_STEPS[0]);
  });

  it('deja todos los vehículos bajo el escalón más alto', () => {
    const masCaro = Math.max(...seedVehicles.map((v) => v.price));
    expect(masCaro).toBeLessThanOrEqual(PRICE_STEPS[PRICE_STEPS.length - 1]);
  });

  it('está ordenado de menor a mayor', () => {
    expect([...PRICE_STEPS].sort((a, b) => a - b)).toEqual([...PRICE_STEPS]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npm test -- format`
Expected: FAIL — `money(12900)` devuelve `"$ 12.900"`, y `PRICE_STEPS` no existe en `@/lib/design`.

- [ ] **Step 3: Cambiar `money`**

En `frontend/src/lib/format.ts`, reemplazar la función:

```ts
/**
 * Los seis vehículos están publicados en dólares y sus precios ya circularon
 * así por WhatsApp. Convertir a pesos exigiría una cotización inventada que
 * envejece en semanas.
 */
export function money(value: number): string {
  return `US$ ${value.toLocaleString(LOCALE)}`;
}
```

- [ ] **Step 4: Mover `PRICE_STEPS` a `design.ts` con valores en dólares**

Agregar al final de `frontend/src/lib/design.ts`:

```ts
/**
 * Escalones del filtro de precio, en dólares. Estaba duplicado en `CatalogoView`
 * y en `QuickSearch` con valores en millones de pesos: con dólares, esos
 * escalones dejaban los seis vehículos del mismo lado y el filtro no filtraba
 * nada. Vive acá para que no vuelvan a divergir.
 */
export const PRICE_STEPS = [8_000, 10_000, 13_000, 20_000, 40_000];
```

- [ ] **Step 5: Consumirlo desde los dos componentes**

En `frontend/src/app/catalogo/CatalogoView.tsx`, borrar la línea 48
(`const PRICE_STEPS = [15_000_000, …];`) y agregar `PRICE_STEPS` al import que ya
trae otras cosas de `@/lib/design`.

En `frontend/src/components/site/QuickSearch.tsx`, borrar la línea 17 e importar
`PRICE_STEPS` de `@/lib/design` igual.

- [ ] **Step 6: Correr los tests**

Run: `cd frontend && npm test`
Expected: PASS — toda la suite.

- [ ] **Step 7: Verificar el filtro a mano**

Levantar `npm run dev`, abrir `/catalogo` y elegir "Hasta US$ 10.000": tienen que quedar el Palio (9.500) y la PCX (7.500). Elegir "Hasta US$ 8.000": solo la PCX.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib frontend/src/app/catalogo/CatalogoView.tsx frontend/src/components/site/QuickSearch.tsx
git commit -m "feat(frontend): precios en dolares y escalones de filtro en un solo lugar"
```

---

### Task 7: La card del catálogo muestra la foto

**Files:**
- Modify: `frontend/src/components/site/VehicleCard.tsx`
- Modify: `frontend/next.config.ts`

**Interfaces:**
- Consumes: `Vehicle.images` (Task 4), `seedVehicles` (Task 5).
- Produces: la card renderiza `images[0]` con `images[1]` en el hover; sin fotos, conserva el marcador de bandas.

- [ ] **Step 1: Cachear `/vehiculos/*` como inmutable**

En `frontend/next.config.ts`, agregar una segunda entrada al array que devuelve `headers()`:

```ts
      {
        /* Mismo criterio que `/uploads`: son assets versionados por nombre de
           archivo, así que pueden cachearse para siempre. */
        source: '/vehiculos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
```

- [ ] **Step 2: Cambiar el bloque de la foto en `VehicleCard`**

Reemplazar el `<div>` con `aspectRatio: '4 / 3'` (y su contenido) por:

```tsx
      <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden' }}>
        {vehicle.images.length > 0 ? (
          <>
            <img
              src={vehicle.images[0].src}
              alt={vehicle.images[0].alt}
              loading={index < 3 ? 'eager' : 'lazy'}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {vehicle.images[1] ? (
              <img
                className="vehicle-photo-alt"
                src={vehicle.images[1].src}
                alt=""
                aria-hidden
                loading="lazy"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0,
                  transition: 'opacity 0.4s ease',
                }}
              />
            ) : null}
          </>
        ) : (
          <>
            {/* Sin fotos: el marcador de bandas. Es lo que ve todo vehículo que
                el panel dé de alta, porque todavía no se pueden subir fotos. */}
            <div style={photoPlaceholder(index)}>
              <span style={PLACEHOLDER_LABEL}>
                [ foto — {vehicle.brand} {vehicle.model} ]
              </span>
            </div>
            <div style={{ ...photoPlaceholder(index, true), opacity: 0 }} className="vehicle-photo-alt">
              <span style={PLACEHOLDER_LABEL}>[ foto 2 ]</span>
            </div>
          </>
        )}
        <div style={statusBadge(vehicle.status)}>{meta.label}</div>
      </div>
```

`<img>` y no `next/image`: las fotos ya están dimensionadas y versionadas, el
optimizador de Next necesitaría configuración extra en el contenedor, y el
`Cache-Control` del Step 1 ya resuelve la parte que importa.

- [ ] **Step 3: Verificar a mano**

`npm run dev`, abrir `/` y `/catalogo`. Las seis cards muestran su foto; al pasar
el mouse aparece la segunda. La clase `vehicle-photo-alt` ya tiene su regla de
hover en el CSS global, así que no hay que tocar estilos.

- [ ] **Step 4: Typecheck y commit**

```bash
cd frontend && npm run typecheck && npm test
git add frontend/src/components/site/VehicleCard.tsx frontend/next.config.ts
git commit -m "feat(frontend): la card del catalogo muestra la foto real del vehiculo"
```

---

### Task 8: La galería de la ficha muestra las fotos

**Files:**
- Modify: `frontend/src/app/vehiculos/[id]/VehiculoDetalleView.tsx`

**Interfaces:**
- Consumes: `Vehicle.images` (Task 4).
- Produces: galería con la cantidad real de fotos del vehículo, no las 5 fijas de hoy.

- [ ] **Step 1: Reemplazar `PHOTO_COUNT` por la cantidad real**

`PHOTO_COUNT = 5` (línea 26) es una constante de módulo, pero ahora depende del
vehículo. Dentro del componente, derivarla:

```tsx
  /* Antes eran 5 fijas porque todas las fotos eran marcadores. Ahora cada
     vehículo trae las suyas: el Etios 2017 tiene 10 y la PCX 5. */
  const fotos = vehicle.images;
  const photoCount = Math.max(fotos.length, 1);
```

Reemplazar cada uso de `PHOTO_COUNT` por `photoCount`, incluidos los `useCallback`
de `prev` y `next` (líneas 74-75), a los que hay que agregarles `photoCount` en el
array de dependencias.

- [ ] **Step 2: Renderizar la foto activa**

En el bloque de la foto principal (alrededor de la línea 190), mostrar la imagen
cuando exista y el marcador cuando no:

```tsx
        {fotos.length > 0 ? (
          <img
            src={fotos[activeIndex].src}
            alt={fotos[activeIndex].alt}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: galleryStripe(activeIndex) }}>
            <span style={PLACEHOLDER_LABEL}>
              [ foto {activeIndex + 1} de {photoCount} — {vehicle.model} {vehicle.version} ]
            </span>
          </div>
        )}
```

- [ ] **Step 3: Renderizar las miniaturas**

En el `Array.from({ length: PHOTO_COUNT }, …)` de la línea 254, recorrer `fotos`
cuando las haya:

```tsx
            {(fotos.length > 0 ? fotos : Array.from({ length: photoCount })).map((foto, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', padding: 0, border: 0, cursor: 'pointer' }}
              >
                {foto && typeof foto === 'object' && 'src' in foto ? (
                  <img
                    src={foto.src}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: galleryStripe(index) }} />
                )}
              </button>
            ))}
```

Conservar el resto de los estilos y atributos que ya tenía cada miniatura
(el borde del activo, sobre todo): leerlos del archivo antes de reemplazar.

- [ ] **Step 4: Hacer que la ficha de datos omita lo que no hay**

`engine`, `traction`, `doors` y `description` ahora pueden ser `undefined`. En la
lista de especificaciones de la ficha, filtrar las filas sin dato en vez de
mostrar una vacía:

```tsx
  /* Mismo criterio que el catálogo anterior: las specs se arman de los campos
     reales y se saltea el que nadie cargó. Una fila "Motor: —" es ruido. */
  const specs = [
    { label: 'Año', value: String(vehicle.year) },
    { label: 'Kilometraje', value: kilometers(vehicle.mileage) },
    { label: 'Combustible', value: vehicle.fuel },
    { label: 'Transmisión', value: vehicle.transmission },
    { label: 'Color', value: vehicle.color },
    vehicle.engine ? { label: 'Motor', value: vehicle.engine } : null,
    vehicle.traction ? { label: 'Tracción', value: vehicle.traction } : null,
    vehicle.doors ? { label: 'Puertas', value: String(vehicle.doors) } : null,
  ].filter((spec): spec is { label: string; value: string } => spec !== null);
```

Adaptar los nombres a los que el archivo ya use. La descripción, cuando falte, se
omite entera: no se reemplaza por texto genérico.

- [ ] **Step 5: Verificar a mano**

Abrir `/vehiculos/etios17` (10 fotos, con GNC en combustible), `/vehiculos/pcx26`
(5 fotos, 0 km, moto) y comprobar que las flechas dan la vuelta bien y que no
aparece ninguna fila de spec vacía.

- [ ] **Step 6: Typecheck y commit**

```bash
cd frontend && npm run typecheck && npm test
git add "frontend/src/app/vehiculos/[id]/VehiculoDetalleView.tsx"
git commit -m "feat(frontend): la ficha muestra las fotos reales y omite los datos que faltan"
```

---

### Task 9: El panel muestra la foto y admite margen sin cargar

**Files:**
- Modify: `frontend/src/app/admin/vehiculos/AdminVehiculosView.tsx`

**Interfaces:**
- Consumes: `Vehicle.images`, `purchasePrice === 0` (Tasks 4 y 5).
- Produces: la tabla del panel muestra miniatura, y la columna de margen dice "sin cargar" cuando no hay costo.

- [ ] **Step 1: Mostrar "sin cargar" en vez de un margen falso**

En `AdminVehiculosView.tsx` hay dos lugares que calculan el margen (líneas 415 y
483). Extraer la decisión a una función arriba del componente:

```tsx
/**
 * Sin precio de compra no hay margen que calcular. Antes esto daba el precio de
 * venta entero y se leía como una ganancia del 100 %: los seis vehículos reales
 * vienen con `purchasePrice` en 0 porque son costos que la agencia no nos pasó.
 */
function margenVisible(vehicle: Vehicle): { texto: string; tono: string } {
  if (vehicle.purchasePrice === 0) {
    return { texto: 'sin cargar', tono: 'var(--muted)' };
  }
  const margen = vehicle.price - vehicle.purchasePrice - vehicle.expenses;
  return { texto: money(margen), tono: marginTone(margen) };
}
```

Reemplazar los dos bloques que hacían `const margin = vehicle.price - …` seguido de
`{money(margin)}` con `marginTone(margin)`, por una llamada a `margenVisible(vehicle)`
usando `texto` y `tono`.

Hacer lo mismo con las celdas de `purchasePrice` y `expenses` (líneas 448 y 450):
cuando valen 0, mostrar `—` en `var(--muted)` en lugar de `US$ 0`.

- [ ] **Step 2: Agregar la miniatura a la tabla**

En la fila de cada vehículo, antes de la columna del nombre, una miniatura de 56×42
que caiga al marcador cuando no hay fotos:

```tsx
                  <div style={{ width: 56, height: 42, overflow: 'hidden', flexShrink: 0 }}>
                    {vehicle.images.length > 0 ? (
                      <img
                        src={vehicle.images[0].src}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--placeholder-a)' }} />
                    )}
                  </div>
```

Es decorativa: el nombre del vehículo está al lado, así que `alt=""` y `aria-hidden`
evitan que el lector de pantalla lo lea dos veces.

- [ ] **Step 3: Revisar el formulario de alta**

El formulario setea `purchasePrice: String(vehicle.purchasePrice)` (línea 199) y
`expenses` (línea 204). Con `0`, eso pone `"0"` en el campo. Cambiarlo para que
un `0` deje el campo vacío, así el dueño ve un campo por llenar y no un cero que
parece un dato cargado:

```tsx
      purchasePrice: vehicle.purchasePrice ? String(vehicle.purchasePrice) : '',
```

y

```tsx
    setExpenses({ ...EMPTY_EXPENSES, otros: vehicle.expenses ? String(vehicle.expenses) : '' });
```

- [ ] **Step 4: Verificar a mano**

Entrar a `/admin/vehiculos` con sesión. Los seis vehículos con su miniatura, la
columna de margen diciendo "sin cargar", y compra y gastos con `—`. Editar uno y
cargarle un precio de compra: el margen tiene que aparecer calculado.

- [ ] **Step 5: Typecheck y commit**

```bash
cd frontend && npm run typecheck && npm test
git add frontend/src/app/admin/vehiculos/AdminVehiculosView.tsx
git commit -m "feat(frontend): el panel muestra miniaturas y no finge margen sin costo cargado"
```

---

## Fase 3 — Semilla con todos los estados

### Task 10: La semilla del panel, coherente con el catálogo real

**Files:**
- Modify: `frontend/src/server/data/crm.ts`
- Test: `frontend/src/server/data/crm.test.ts`

**Interfaces:**
- Consumes: `LeadStatus`, `AppointmentStatus`, `ActionAlertType` de `@/types`; los nombres de modelo de `seedVehicles` (Task 5).
- Produces: `seedLeads`, `seedAppointments` y `seedActionAlerts` con la cobertura de estados fijada por tests, fechas relativas a hoy, y vehículos que existen en el catálogo.

**Ojo con el punto de partida.** La semilla actual **ya cubre los diez estados**
(12 consultas y 12 turnos, y las tres clases de alerta). El trabajo de esta task
no es agregar estados sino tres cosas que sí están rotas o quedan rotas después de
la Task 5: fijar esa cobertura con tests para que no se pierda, descongelar las
fechas, y corregir los vehículos que dejaron de existir.

- [ ] **Step 1: Escribir el test que falla**

`frontend/src/server/data/crm.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { seedActionAlerts, seedAppointments, seedLeads } from '@/server/data/crm';
import type { AppointmentStatus, LeadStatus } from '@/types';

const ESTADOS_LEAD: LeadStatus[] = ['new', 'contacted', 'negotiating', 'closed', 'discarded'];
const ESTADOS_TURNO: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

describe('semilla del panel', () => {
  it.each(ESTADOS_LEAD)('tiene al menos una consulta en estado %s', (estado) => {
    expect(seedLeads.some((lead) => lead.status === estado)).toBe(true);
  });

  it.each(ESTADOS_TURNO)('tiene al menos un turno en estado %s', (estado) => {
    expect(seedAppointments.some((turno) => turno.status === estado)).toBe(true);
  });

  it('tiene las tres clases de alerta del dashboard', () => {
    expect(new Set(seedActionAlerts.map((a) => a.type))).toEqual(
      new Set(['urgent', 'important', 'pending']),
    );
  });

  it('pone los turnos terminados y cancelados en el pasado', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    for (const turno of seedAppointments) {
      if (turno.status === 'completed' || turno.status === 'cancelled') {
        expect(turno.date < hoy).toBe(true);
      }
    }
  });

  it('pone los turnos pendientes y confirmados a futuro', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    for (const turno of seedAppointments) {
      if (turno.status === 'pending' || turno.status === 'confirmed') {
        expect(turno.date >= hoy).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npm test -- crm`
Expected: FAIL — faltan estados.

- [ ] **Step 3: Arreglar las fechas congeladas**

`crm.ts:15` tiene `const AGENDA_WEEK = '2026-09'` y `day(d)` arma
`` `${AGENDA_WEEK}-${d}` ``: **toda la agenda está clavada a septiembre de 2026.**
Hoy funciona por casualidad. Dentro de un mes, todos los turnos quedan en el
pasado, incluidos los `pending` y `confirmed`, y el panel muestra una agenda que
no tiene sentido — justo en una demo que va a quedar levantada.

Reemplazar el helper por uno relativo, conservando la firma para no tocar los
doce turnos:

```ts
/**
 * Días desde hoy, no una fecha fija. Antes esto era `AGENDA_WEEK = '2026-09'`,
 * con lo cual la agenda entera envejecía: un turno "confirmado" pasaba a estar
 * en el pasado con solo dejar correr el calendario. La demo queda levantada en
 * el home lab, así que tiene que seguir teniendo sentido en un mes.
 */
const day = (offset: number): string => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + offset);
  return fecha.toISOString().slice(0, 10);
};
```

Después hay que reinterpretar cada llamada: hoy `day(3)` significa "3 de
septiembre" y pasa a significar "dentro de 3 días". Recorrer los doce turnos y
poner el offset que corresponda a su estado:

- `completed` y `cancelled` → negativos (`day(-2)`, `day(-9)`).
- `in_progress` → `day(0)`, hoy.
- `pending` y `confirmed` → positivos (`day(1)`, `day(3)`, `day(6)`).

- [ ] **Step 4: Corregir los vehículos que ya no existen**

Las consultas y los turnos mencionan el stock del prototipo — Corolla XEi,
T-Cross, 208 Feline, Amarok V6, Ranger XLT, Onix RS, Cronos, Golf — y la Task 5
reemplazó el catálogo por los seis reales. El panel quedaría lleno de consultas
sobre autos que no están en stock.

Reemplazar cada `vehicle:` por uno de los seis reales, repartidos:
`'Toyota Etios XLS'`, `'Toyota Hilux SW4 SRX'`, `'Fiat Palio Essence'`,
`'Volkswagen Fox Comfort'`, `'Toyota Etios XLS 2016'`, `'Honda PCX Deluxe'`.
El `vehicle: '—'` que ya existe se deja: es una consulta general, sin vehículo.

Ajustar también el texto de los `message` que nombran el modelo viejo
(`'Quiero consultar por el Corolla…'`).

- [ ] **Step 5: Comprobar la cobertura de estados**

Los diez estados **ya están cubiertos** por los doce leads y los doce turnos que
la semilla trae. El test del Step 1 no agrega registros: fija esa cobertura para
que un futuro recorte de la semilla no la rompa en silencio. Si alguno faltara
después de los pasos anteriores, agregar el registro que falte siguiendo el
formato que el archivo ya usa: `contact` con `223 555-01NN · nombre@example.com`,
nombre de pila más inicial (`'Martina G.'`).

- [ ] **Step 6: Correr los tests**

Run: `cd frontend && npm test`
Expected: PASS — toda la suite.

- [ ] **Step 7: Verificar a mano**

Entrar a `/admin/consultas` y `/admin/detailing`. Cada sección tiene que mostrar
todos sus estados, con sus colores y sus acciones. Comprobar que los turnos
`completed` no ofrecen "Completar" y que los `cancelled` no ofrecen nada, y que
la agenda de detailing muestra el turno `in_progress` en el día de hoy.

Comprobar también que ninguna consulta menciona un vehículo que no esté en el
catálogo.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/server/data/crm.ts frontend/src/server/data/crm.test.ts
git commit -m "fix(frontend): la agenda del panel estaba clavada a septiembre de 2026"
```

---

### Task 11: Un usuario invitado pendiente en el backend

**Files:**
- Modify: `backend/prisma/seed.ts`
- Modify: `backend/.env.example`
- Test: `backend/tests/seed.test.ts`

**Interfaces:**
- Consumes: `seedBootstrapAdmin(email: string)` que ya existe.
- Produces: `seedInvitedUser(email: string, role: Role)` — segundo usuario, queda `PENDING`.

- [ ] **Step 1: Escribir el test que falla**

Agregar a `backend/tests/seed.test.ts` (crearlo si no existe, siguiendo el patrón
de los otros archivos de `backend/tests/`, que ya levantan la base de tests):

```ts
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { seedInvitedUser } from '../prisma/seed.js';

describe('seedInvitedUser', () => {
  it('crea el usuario invitado en PENDING, sin googleSub', async () => {
    await seedInvitedUser('invitado@example.com', 'EDITOR');

    const usuario = await prisma.user.findUnique({ where: { email: 'invitado@example.com' } });

    expect(usuario?.status).toBe('PENDING');
    expect(usuario?.role).toBe('EDITOR');
    expect(usuario?.googleSub).toBeNull();
  });

  it('es idempotente: corre en cada arranque del contenedor', async () => {
    await seedInvitedUser('invitado@example.com', 'EDITOR');
    await seedInvitedUser('invitado@example.com', 'EDITOR');

    const cuantos = await prisma.user.count({ where: { email: 'invitado@example.com' } });
    expect(cuantos).toBe(1);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd backend
npm run db:up
DATABASE_URL=$(grep '^DATABASE_URL_TEST=' .env.test | cut -d= -f2-) npx prisma migrate deploy
npm test -- seed
```

Expected: FAIL — `seedInvitedUser` no existe.

- [ ] **Step 3: Agregar la función**

En `backend/prisma/seed.ts`, junto a `seedBootstrapAdmin`:

```ts
/**
 * Segundo usuario, invitado y sin estrenar. Existe para que el panel muestre el
 * estado PENDING además del ACTIVE del administrador: sin esto, la pantalla de
 * usuarios tiene una sola fila y no se ve cómo luce una invitación sin aceptar.
 */
export async function seedInvitedUser(email: string, role: Role): Promise<void> {
  const normalizado = email.trim().toLowerCase();

  await prisma.user.upsert({
    where: { email: normalizado },
    update: {},
    create: {
      email: normalizado,
      name: normalizado.split('@')[0] ?? normalizado,
      role,
      status: 'PENDING',
    },
  });
}
```

Importar `Role` desde `../src/db/prisma.js`, como hace el resto del backend.

- [ ] **Step 4: Llamarla desde el ejecutable**

En el bloque `if (import.meta.url === pathToFileURL(...))` del final del archivo,
después de `seedBootstrapAdmin`:

```ts
  const invitado = process.env.SEED_INVITED_EMAIL;
  if (invitado) {
    await seedInvitedUser(invitado, 'EDITOR');
    console.log(`Usuario invitado listo: ${invitado.toLowerCase()}`);
  }
```

Es opcional a propósito: sin la variable, el seed hace exactamente lo que hacía.

- [ ] **Step 5: Documentar la variable**

Agregar a `backend/.env.example`, debajo de `BOOTSTRAP_ADMIN_EMAIL`:

```
# Segundo usuario, opcional. Queda PENDING para que el panel muestre ese estado.
SEED_INVITED_EMAIL=
```

- [ ] **Step 6: Correr los tests del backend**

Run: `cd backend && npm test && npm run typecheck`
Expected: PASS — los 62 que ya había más los 2 nuevos.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/seed.ts backend/tests/seed.test.ts backend/.env.example
git commit -m "feat(backend): usuario invitado opcional en la semilla, para ver el estado PENDING"
```

---

## Fase 4 — Empaquetado y despliegue

### Task 12: Imagen del backend

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/docker-entrypoint.sh`
- Create: `backend/.dockerignore`

**Interfaces:**
- Produces: imagen que expone el puerto 4000 y arranca migrando.

- [ ] **Step 1: Escribir el `.dockerignore`**

`backend/.dockerignore`:

```
node_modules
src/generated
.env
.env.test
tests
*.tsbuildinfo
docker-compose.yml
```

`src/generated` se ignora **a propósito**: lo genera `prisma generate` dentro de la
imagen. Copiar el de la máquina de desarrollo traería binarios compilados para
Windows.

- [ ] **Step 2: Escribir el entrypoint**

`backend/docker-entrypoint.sh`:

```sh
#!/bin/sh
set -e

# Migrar antes de escuchar. Si falla, el contenedor sale y Docker reintenta:
# es preferible a un backend sirviendo contra un esquema viejo.
echo "Aplicando migraciones..."
npx prisma migrate deploy

if [ -n "$BOOTSTRAP_ADMIN_EMAIL" ]; then
  echo "Sembrando usuarios..."
  # Idempotente (upsert con update vacío): correrlo en cada arranque no duplica
  # nada y no pisa cambios hechos desde el panel.
  npx tsx prisma/seed.ts
fi

echo "Levantando Fastify..."
exec npm start
```

- [ ] **Step 3: Escribir el Dockerfile**

`backend/Dockerfile`:

```dockerfile
# slim y no alpine: el motor de migraciones de Prisma es donde musl y OpenSSL
# suelen romper, y `migrate deploy` es el paso del que depende todo el arranque.
FROM node:22-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
# Obligatorio: `src/generated` está gitignoreado, así que un clone limpio no
# trae el cliente de Prisma y sin esto el proceso muere al importar `db/prisma`.
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
```

- [ ] **Step 4: Construir la imagen y verificar que `prisma generate` corrió**

```bash
cd backend
docker build -t motors-backend:test .
docker run --rm motors-backend:test ls src/generated/prisma
```

Expected: lista los archivos del cliente (`client.ts`, `models.ts`, …).

**Si `prisma generate` o el build fallan por OpenSSL**, cambiar la primera línea a
`FROM node:22-bookworm` y volver a construir. Anotarlo en el commit.

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/docker-entrypoint.sh backend/.dockerignore
git commit -m "feat(backend): imagen con prisma generate y migraciones en el arranque"
```

---

### Task 13: Imagen del frontend

**Files:**
- Modify: `frontend/next.config.ts`
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_WHATSAPP_NUMBER` como build arg.
- Produces: imagen que expone el puerto 3000 y sirve el `standalone`.

- [ ] **Step 1: Activar `standalone`**

En `frontend/next.config.ts`, dentro de `nextConfig`, antes de `headers()`:

```ts
  /* `standalone` arma en .next/standalone un servidor con sólo las dependencias
     que el runtime usa de verdad. La imagen final pasa de cientos de MB a
     decenas, y en un home lab eso es tiempo de build en cada iteración. */
  output: 'standalone',
```

- [ ] **Step 2: Escribir el `.dockerignore`**

`frontend/.dockerignore`:

```
node_modules
.next
.env
.env.local
.impeccable
DESIGN.md
*.tsbuildinfo
src/**/*.test.ts
vitest.config.ts
```

`public/` **no** se ignora: son los 30 MB de fotos y videos que el sitio sirve.

- [ ] **Step 3: Escribir el Dockerfile**

`frontend/Dockerfile`:

```dockerfile
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Las variables NEXT_PUBLIC_ se hornean en el bundle del navegador: tienen que
# existir en el build, no en el arranque. Si cambia el número hay que reconstruir.
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=""
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER

RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# El output standalone NO incluye `public/` ni `.next/static`: hay que copiarlos
# a mano. Si se olvida, el sitio levanta sin CSS, sin fotos y sin videos, y el
# sintoma parece un problema de estilos.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
```

- [ ] **Step 4: Construir y verificar que los assets llegaron**

```bash
cd frontend
docker build -t motors-web:test --build-arg NEXT_PUBLIC_WHATSAPP_NUMBER=5492233122894 .
docker run --rm motors-web:test sh -c "ls .next/static && ls public/vehiculos"
```

Expected: lista los chunks estáticos y las seis carpetas de vehículos. **Este paso
es el que atrapa el error del comentario**: si `public/vehiculos` no aparece, la
copia del Step 3 está mal.

- [ ] **Step 5: Levantar la imagen sola y comprobar que responde**

```bash
docker run --rm -p 3001:3000 -e BACKEND_URL=http://localhost:4000 motors-web:test
curl -s -o /dev/null -w "%{http_code}\n" localhost:3001    # 200
curl -s -o /dev/null -w "%{http_code}\n" localhost:3001/vehiculos/etios17/01.jpg  # 200
```

- [ ] **Step 6: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore frontend/next.config.ts
git commit -m "feat(frontend): imagen standalone con los assets copiados a mano"
```

---

### Task 14: El stack completo

**Files:**
- Create: `compose.yaml`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: las imágenes de las Tasks 12 y 13.
- Produces: `docker compose up -d --build` levanta los tres servicios con solo `web` publicando puerto.

- [ ] **Step 1: Cerrar el agujero del `.gitignore` — antes que nada**

El `.gitignore` de la raíz ignora `.env*.local` pero **no `.env` a secas**, así que
el `.env` de producción se commitearía con los secretos adentro. Agregar arriba de
todo en `.gitignore`:

```
# El .env de produccion vive solo en el servidor. Un secreto commiteado no se
# borra del historial.
.env
```

Verificar antes de seguir:

```bash
echo "SECRETO=no-commitear" > .env
git status --short   # .env NO tiene que aparecer
rm .env
```

- [ ] **Step 2: Escribir el `compose.yaml`**

`compose.yaml` en la raíz:

```yaml
# Stack de produccion. El compose de desarrollo sigue siendo
# backend/docker-compose.yml, que levanta solo Postgres.
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - motors-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 10
    # Sin `ports`: la base solo existe dentro de la red del compose.

  backend:
    build: ./backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: ${DATABASE_URL}
      APP_ORIGIN: ${APP_ORIGIN}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      OAUTH_REDIRECT_URI: ${OAUTH_REDIRECT_URI}
      SESSION_COOKIE_SECRET: ${SESSION_COOKIE_SECRET}
      BOOTSTRAP_ADMIN_EMAIL: ${BOOTSTRAP_ADMIN_EMAIL}
      SEED_INVITED_EMAIL: ${SEED_INVITED_EMAIL:-}
      SENTRY_DSN: ${SENTRY_DSN:-}
      SENTRY_ENVIRONMENT: production
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 40s
    # Sin `ports`: solo Next le habla, por la red interna.

  web:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_WHATSAPP_NUMBER: ${NEXT_PUBLIC_WHATSAPP_NUMBER:-}
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    environment:
      NODE_ENV: production
      BACKEND_URL: http://backend:4000
      NEXT_PUBLIC_SENTRY_DSN: ${NEXT_PUBLIC_SENTRY_DSN:-}
      SENTRY_DSN: ${NEXT_PUBLIC_SENTRY_DSN:-}
      SENTRY_ENVIRONMENT: production
    ports:
      # El unico puerto publicado. Tailscale Funnel apunta acá.
      - "3000:3000"

volumes:
  motors-db-data:
```

- [ ] **Step 3: Escribir el `.env.example`**

`.env.example` en la raíz:

```bash
# Plantilla del .env de PRODUCCION. Los de desarrollo son backend/.env y
# frontend/.env.local, y no tienen nada que ver con este.

# --- Postgres ---
POSTGRES_USER=motors
# Generar con: openssl rand -base64 24
POSTGRES_PASSWORD=
POSTGRES_DB=motors

# --- Backend ---
# `db` es el nombre del servicio en compose.yaml, no un host de la red.
DATABASE_URL=postgresql://motors:LA_MISMA_CONTRASENA@db:5432/motors

# La URL publica que da `tailscale funnel status`, sin barra final.
APP_ORIGIN=https://MAQUINA.TAILNET.ts.net
OAUTH_REDIRECT_URI=https://MAQUINA.TAILNET.ts.net/api/auth/google/callback

# Los mismos de desarrollo. El redirect URI de arriba hay que darlo de alta en
# Google Cloud Console: se AGREGA, no reemplaza al de localhost.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Uno nuevo, distinto del de desarrollo. Generar con:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Cambiarlo despues cierra todas las sesiones abiertas.
SESSION_COOKIE_SECRET=

# Primer administrador. Tiene que ser una cuenta de Google real.
BOOTSTRAP_ADMIN_EMAIL=
# Opcional: segundo usuario, queda PENDING para que se vea ese estado.
SEED_INVITED_EMAIL=

# --- Web ---
# Se hornea en el build. Si cambia, hay que reconstruir la imagen.
NEXT_PUBLIC_WHATSAPP_NUMBER=5492233122894

# --- Sentry (opcional; sin DSN no se inicializa) ---
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

- [ ] **Step 4: Probar el stack entero en la máquina de desarrollo**

```bash
cp .env.example .env
```

Editar `.env`: contraseña de Postgres, credenciales de Google, `SESSION_COOKIE_SECRET`,
`BOOTSTRAP_ADMIN_EMAIL`, y **`APP_ORIGIN=http://localhost:3000`** con
`OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback` para esta prueba.

```bash
docker compose up -d --build
docker compose ps
```

Expected: los tres `healthy`.

- [ ] **Step 5: Correr la escalera de verificación**

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000                    # 200
docker compose exec web node -e "fetch('http://backend:4000/health').then(r=>r.text()).then(console.log)"
curl -s localhost:4000/health                                              # connection refused
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/admin/vehicles # 401
curl -s localhost:3000/api/vehicles | head -c 200                          # los 6 vehiculos
```

El tercero es el que confirma el aislamiento: **si responde, `backend` tiene un
`ports:` que no debería tener.**

- [ ] **Step 6: Bajar el stack de prueba**

```bash
docker compose down
rm .env
```

- [ ] **Step 7: Commit**

```bash
git add compose.yaml .env.example .gitignore
git commit -m "feat: stack de produccion con solo el frontend publicando puerto"
```

---

### Task 15: DEPLOY.md y documentación al día

**Files:**
- Create: `DEPLOY.md`
- Modify: `PRODUCT.md`
- Modify: `docs/ESTADO.md`

- [ ] **Step 1: Escribir `DEPLOY.md`**

Con estas secciones, en este orden. El contenido de cada una sale del spec
(`docs/superpowers/specs/2026-09-09-despliegue-home-lab-design.md`), secciones
"Configuración", "Verificación" y "Operación":

1. **Una vez — 1. Repo remoto.** Crear un repositorio **privado** en GitHub y
   empujar. Hoy el proyecto vive en un solo disco.
2. **Una vez — 2. Tailscale primero.** `tailscale up`, y `tailscale status` para
   leer el nombre de la máquina. Explicar por qué va antes que el stack: el
   backend valida `APP_ORIGIN` y `OAUTH_REDIRECT_URI` como URLs al arrancar
   (`backend/src/env.ts`) y muere si faltan, así que no se puede levantar primero
   y completar después.
3. **Una vez — 3. Clonar y escribir el `.env`.** `cp .env.example .env` y
   completarlo con la URL del paso anterior.
4. **Una vez — 4. Google Cloud Console.** Agregar el redirect URI. **Se agrega, no
   reemplaza.** Es el único paso fuera del servidor; si se olvida, el síntoma es
   `redirect_uri_mismatch` de Google, no un error de la app.
5. **Una vez — 5. Levantar.** `docker compose up -d --build`.
6. **Una vez — 6. Publicar.** `tailscale funnel --bg 3000` y `tailscale funnel status`.
   Nota sobre los requisitos del tailnet: HTTPS y Funnel habilitados en la consola.
7. **Verificación**, con la escalera completa del spec y la salida esperada de cada
   comando, incluida la comprobación de que el backend **no** se alcanza desde el
   host y de que `/api/admin/vehicles` da 401.
8. **Cada actualización:** `git pull && docker compose up -d --build`.
9. **Respaldo**, con la advertencia de que hoy solo respalda usuarios y sesiones.
10. **Mudanza al dominio de la empresa.**
11. **Nginx Proxy Manager:** por qué no participa, y la advertencia de que un nginx
    en el host pelea por los puertos 80 y 443 con NPM.
12. **Limitaciones conocidas**, las cuatro del spec: store en memoria, sin subida
    de fotos, costos en cero a propósito, y las 3 vulnerabilidades de `next@15.5.4`.

- [ ] **Step 2: Actualizar `PRODUCT.md`**

Dos cambios, en "Evidence on Hand":

- Mover el número de WhatsApp de "No confirmado" a "Real y confirmado":
  `+54 9 2233 12-2894` (`5492233122894`).
- Cambiar la línea de las fotos: ya no es cierto que no existan. Dejar escrito que
  hay 45 fotos reales de los seis vehículos del stock, y que cualquier vehículo
  nuevo cargado desde el panel sigue mostrando el marcador de bandas porque no hay
  forma de subir fotos.

En "Capabilities and Constraints", actualizar la línea de auth: `/api/admin/*` ya
no está sin proteger.

- [ ] **Step 3: Actualizar `docs/ESTADO.md`**

Reemplazar el contenido por el estado real: las 12 tasks del backend de auth
terminadas, este trabajo terminado, y cómo retomar. Conservar la sección "Trampa
del entorno que costó una hora" (los dev servers duplicados): sigue siendo válida
y cuesta caro volver a descubrirla.

- [ ] **Step 4: Verificación final completa**

```bash
cd backend && npm test && npm run typecheck
cd ../frontend && npm test && npm run typecheck && npm run build
cd .. && git status --short   # limpio
```

- [ ] **Step 5: Commit**

```bash
git add DEPLOY.md PRODUCT.md docs/ESTADO.md
git commit -m "docs: procedimiento de despliegue en el home lab y estado al dia"
```

---

## Verificación final en el servidor

No es una task porque no ocurre en el repo, pero el trabajo no está terminado hasta
que esto pase:

- [ ] `docker compose ps` en el Debian muestra los tres servicios `healthy`.
- [ ] La URL de Funnel abre el sitio desde una red que no es la de casa (datos del
      celular, no wifi).
- [ ] El catálogo muestra los seis vehículos con sus fotos.
- [ ] `/admin` redirige a `/login`, el ingreso con Google funciona, y el usuario
      queda `ACTIVE`:

```bash
docker compose exec -T db psql -U motors -d motors \
  -c 'select email, role, status from "User";'
```

- [ ] `curl https://<url>/api/admin/vehicles` desde afuera, sin cookie, responde
      `401` y no filtra ningún costo.
- [ ] El panel muestra todos los estados en consultas y en detailing.
