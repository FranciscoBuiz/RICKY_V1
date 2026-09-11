# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Cuatro audiencias con jobs distintos sobre el mismo producto:

- **Compradores.** Buscan un usado en Mar del Plata. Comparan stock, filtran por
  marca / carrocería / combustible / precio, miran la ficha de un vehículo y
  terminan iniciando una consulta (formulario o WhatsApp). Llegan mayormente
  desde el celular y desde Instagram.
- **Vendedores particulares.** Tienen un auto para vender y quieren saber si la
  agencia se lo toma. Recorren `/vender-mi-auto`: cargan datos del vehículo,
  estado y fotos en un formulario de varios pasos. No conocen la terminología
  del rubro; el formulario tiene que ir guiándolos.
- **Clientes de detailing.** Reservan un turno en `/detailing/turno`. Pueden ser
  clientes de la agencia o gente que sólo viene por el servicio.
- **Equipo de la agencia.** Opera el panel `/admin`: alta y edición de stock con
  costos y margen, seguimiento de consultas, agenda de detailing, solicitudes de
  venta y configuración. Es uso diario, de escritorio, con datos densos.

## Product Purpose

Sitio público + panel de administración de **5848 Motors**, agencia de vehículos
usados en Mar del Plata. El sitio tiene que convertir interés en una consulta
real (compra, venta o turno de detailing); el panel tiene que dejar que el
equipo sostenga ese sitio sin depender de nadie: cargar stock, responder
consultas y ordenar la agenda de detailing.

Éxito = consultas y turnos que entran completos y bien clasificados, y un equipo
que puede mantener el stock al día sin fricción.

## Positioning

**Trato directo y local.** Una agencia de Mar del Plata donde se trata con la
gente de la agencia, no con un call center ni una plataforma intermediaria.
Nada de la experiencia debe sonar a marketplace impersonal o a formulario que
cae en un pozo: cada contacto tiene que dar la sensación de que del otro lado
hay una persona concreta que responde.

## Operating Context

- **Mercado y locale:** Argentina, es-AR. Precios en pesos, patentes en formato
  argentino (`ABC123` y `AB123CD`), teléfonos de 10 dígitos sin 0 ni 15.
- **WhatsApp es el canal real de contacto.** Los enlaces `wa.me` son un camino
  de conversión de primera clase, no un extra.
- **Instagram es la vidriera previa.** Mucho tráfico llega de ahí, en celular.
- **Turnos de detailing por día completo.** El cliente deja el vehículo a
  primera hora y lo retira a última. Por eso no hay grilla de horarios: se elige
  sólo la fecha, y lo que limita la agenda es un cupo diario configurable en
  `/admin/configuracion`. El cupo se revalida al confirmar (409 si el día se
  llenó mientras el visitante completaba sus datos).
- **Un turno puede combinar varios servicios.**
- **El panel se usa desde escritorio**, con tablas y datos de costo; el sitio
  público se usa mayormente desde el celular.
- **Separación de datos sensibles:** `purchasePrice` y `expenses` son internos y
  sólo se exponen bajo `/api/admin/*`; el catálogo público los recorta.

## Capabilities and Constraints

**Ya construido.** Sitio público (home, catálogo, ficha de vehículo, nosotros,
contacto, vender-mi-auto, detailing, reserva de turno, auth) y panel (dashboard,
vehículos, detailing, consultas, configuración). Next.js 15 App Router, React 19,
TypeScript strict, sin librerías de UI de terceros; tokens en CSS variables con
tema claro/oscuro por `data-theme`.

**Restricciones y deudas confirmadas:**

- El store es **en memoria** (`src/server/store.ts`): todo se reinicia con el
  proceso. Falta base de datos y storage de imágenes.
- **Auth resuelta para el panel.** Ingreso con Google (OIDC), solo por
  invitación, con sesión revocable y roles. `/api/admin/*` ya no está sin
  proteger: cada ruta exige sesión válida (verificada contra el backend) antes
  de responder. Sigue sirviéndose desde Next contra el store en memoria; eso se
  cubre cuando esos endpoints se muden al backend.
- Falta la integración real de la API de WhatsApp.
- Terminología del dominio (fijada en `src/types/index.ts`): estados de vehículo
  `available` / `reserved` / `sold`; estados de lead `new` / `contacted` /
  `negotiating` / `closed` / `discarded`; estados de turno `pending` /
  `confirmed` / `in_progress` / `completed` / `cancelled`.

**Decisiones de producto abiertas:** si el stock se sincroniza con alguna otra
fuente y política de precios/publicación.

## Brand Commitments

- **Nombre:** 5848 Motors. Viene de la dirección; el número es identidad, no
  decoración.
- **Instagram:** @5848motors.
- **Idioma:** todo el producto es en español rioplatense (voseo en la UI:
  "vendé", "reservá"). No hay versión en otro idioma.
- No hay logo, manual de marca ni paleta aprobada por el cliente. La identidad
  visual actual del código es una propuesta del prototipo, no un compromiso.

## Evidence on Hand

**Real y confirmado:**

- Nombre **5848 Motors**, dirección **Gaboto 5848, Mar del Plata, Buenos Aires,
  Argentina**, e Instagram **@5848motors**.
- **Número de WhatsApp:** `+54 9 2233 12-2894` (`5492233122894`,
  `NEXT_PUBLIC_WHATSAPP_NUMBER`).

**No confirmado — no tratar como real ni inventar reemplazos:**

- **Stock, consultas, turnos y solicitudes de venta** (`src/server/data/`) son
  datos semilla de demostración, no operación real.
- **Catálogo de servicios de detailing** (`seedServices` en
  `src/server/data/crm.ts`): los seis servicios son propuesta, no la oferta
  confirmada de la agencia.
- **Fotos reales de los vehículos:** ya existen 45 fotos reales de los seis
  vehículos del stock actual (`frontend/public/vehiculos/`). Cualquier vehículo
  nuevo cargado desde el panel sigue mostrando el marcador de bandas
  diagonales, porque no hay forma de subir fotos desde ahí.
- **Teléfono, email y horarios de atención:** sin definir.
- **No hay testimonios, casos, reseñas, métricas de ventas ni premios.** No
  fabricar ninguno.

## Product Principles

1. **Cada camino termina en una conversación.** Comprar, vender o reservar; el
   producto no existe para informar, existe para que entre un contacto
   completo y bien clasificado.
2. **El contenido factual no se inventa.** Sin fotos, testimonios, cifras ni
   horarios reales, el diseño trabaja con lo que hay y deja el hueco visible en
   lugar de rellenarlo con relleno creíble.
3. **Cuatro audiencias, un solo producto.** Comprador, vendedor, cliente de
   detailing y equipo interno tienen jobs distintos; ninguna decisión puede
   optimizar una y romper otra.
4. **El panel es una herramienta de trabajo, no una vidriera.** Densidad,
   escaneabilidad y consistencia mandan sobre la expresión.
5. **El celular es el escenario real del sitio público.** Instagram y WhatsApp
   son el flujo natural; lo que no funciona en un teléfono, no funciona.

## Accessibility & Inclusion

Sin estándar formal comprometido por el cliente. Restricciones de uso reales que
igual condicionan el diseño: uso a una mano en la calle, pantallas chicas y
conexiones móviles del lado público; sesiones largas de escritorio con tablas
densas del lado del panel.
