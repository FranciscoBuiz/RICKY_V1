---
name: 5848 Motors
description: La ficha técnica hecha interfaz — papel cálido, mono en mayúsculas, esquinas rectas y un solo naranja que siempre significa algo.
colors:
  paper: "#faf8f5"
  paper-admin: "#f6f5f2"
  surface: "#ffffff"
  ink: "#171512"
  ink-strong: "#4a453f"
  muted: "#6b6560"
  border: "#e4e0da"
  border-soft: "#f0eeea"
  invert-bg: "#171512"
  invert-ink: "#f5f2ee"
  rust: "#e2610a"
  rust-deep: "#b34a05"
  rust-soft: "#fdf1e7"
  ok: "#2f7a4d"
  info: "#3a5a9b"
  warn: "#8a6d3b"
  danger: "#c0392b"
  danger-soft: "#fdecea"
  placeholder-ink: "#8f8a83"
typography:
  display:
    fontFamily: "Manrope, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(38px, 6vw, 76px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  page-title:
    fontFamily: "Manrope, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(32px, 5.2vw, 60px)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Manrope, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(26px, 3vw, 36px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  numeral:
    fontFamily: "Manrope, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(60px, 12vw, 140px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
  lead:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(16px, 1.6vw, 19px)"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  none: "0px"
  hairline: "2px"
  full: "50%"
spacing:
  gutter-sm: "16px"
  gutter-md: "20px"
  gutter-lg: "28px"
  shell: "1360px"
components:
  button-primary:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.invert-ink}"
    rounded: "{rounded.hairline}"
    padding: "15px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.rust-deep}"
    textColor: "{colors.invert-ink}"
  button-invert:
    backgroundColor: "{colors.invert-bg}"
    textColor: "{colors.invert-ink}"
    rounded: "{rounded.hairline}"
    padding: "14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.hairline}"
    padding: "13px 24px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "13px 14px"
  input-compact:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  pill-status:
    rounded: "{rounded.none}"
    padding: "3px 8px"
---

# Design System: 5848 Motors

## Overview

**Creative North Star: "La Ficha Técnica"**

Todo en 5848 Motors se lee como una ficha impresa. Un usado se compra
desconfiando, y la ficha técnica es el género visual que ya resuelve esa
desconfianza: datos ordenados, etiquetas en mono, nada que adorne un número.
El sistema toma ese género y lo lleva a toda la interfaz — no sólo a la ficha
del vehículo, sino al panel, a los formularios y a la home.

El tono es **preciso, cálido y directo**. Preciso porque la calidad se demuestra
en la alineación y el espaciado, nunca en el efecto. Cálido porque el fondo no
es blanco clínico sino papel (#faf8f5): la agencia atiende personas, no procesa
expedientes. Directo porque cada pantalla existe para que alguien haga algo, y
el camino a esa acción no se decora.

La superficie es plana por convicción. No hay sombras en reposo, no hay
gradientes decorativos, no hay esquinas redondeadas que suavicen la lectura.
Lo que separa un elemento de otro es un borde de 1px y el aire alrededor. La
profundidad sólo aparece como respuesta a una acción del usuario.

**Key Characteristics:**

- Papel cálido en lugar de blanco; el blanco puro se reserva para tarjetas.
- Mono en mayúsculas con tracking amplio para todo metadato y etiqueta.
- Esquinas rectas (0px) por defecto; 2px es el máximo, y sólo en botones.
- Un solo acento, usado poco y siempre con significado.
- Plano en reposo; el movimiento y la sombra son respuesta, no decoración.
- Tema claro y oscuro son ciudadanos iguales, conmutados por `data-theme`.

## Colors

Una paleta de papel cálido y tinta casi negra, con un único acento de óxido y
una familia de estados que nunca compite con él.

### Primary

- **Naranja Óxido** (#e2610a): el único acento del sistema. Marca la acción
  principal, el estado activo, el enlace y el dato que exige atención.
  Terroso, no fluorescente: es color de taller, no de aviso digital.
- **Óxido Profundo** (#b34a05): exclusivamente el hover del acento. No se usa
  como color de superficie ni de texto.
- **Óxido Papel** (#fdf1e7): el halo de foco de los campos y el fondo de las
  píldoras de estado en tema claro. En oscuro se vuelve `rgba(226,97,10,0.22)`.

### Neutral

- **Papel** (#faf8f5): el fondo del sitio público. Cálido, con algo de amarillo;
  nunca #ffffff.
- **Papel Panel** (#f6f5f2): el fondo del panel admin. Un grado más frío que el
  público — la única diferencia de paleta entre las dos superficies.
- **Blanco Tarjeta** (#ffffff): reservado a las tarjetas y superficies elevadas.
  Su contraste contra el papel es lo que las separa, en lugar de una sombra.
- **Tinta** (#171512): el texto principal y el fondo de los bloques invertidos.
  Casi negro, con temperatura cálida.
- **Tinta Firme** (#4a453f): texto secundario que aún debe leerse con autoridad.
- **Gris Apagado** (#6b6560): metadatos, placeholders, texto de apoyo.
- **Borde** (#e4e0da) y **Borde Suave** (#f0eeea): las dos únicas líneas del
  sistema. La suave separa dentro de un bloque; la normal separa bloques.

### Tertiary

Estados semánticos. Existen para clasificar, no para expresar.

- **Verde Cerrado** (#2f7a4d): disponible, confirmado, cerrado, margen positivo.
- **Azul Proceso** (#3a5a9b): contactado, en proceso.
- **Ámbar Espera** (#8a6d3b): pendiente, en negociación.
- **Rojo Alerta** (#c0392b): error de validación y destructivo. En oscuro sube a
  #e57368 para mantener contraste.

### Named Rules

**La Regla del Acento Escaso.** El Naranja Óxido no supera el 10% de ninguna
pantalla. Si aparece dos veces en el mismo bloque, una de las dos está mal.
Su rareza es lo que lo hace legible como "acá se actúa".

**La Regla del Papel.** El fondo nunca es #ffffff. El blanco puro es
exclusivamente superficie de tarjeta; usarlo como fondo rompe la separación
entre plano y objeto, que es lo único que da profundidad al sistema.

**La Regla del Estado Honesto.** El color de un estado sigue al hecho, no al
optimismo. Un margen negativo se pinta en Rojo Alerta aunque el campo se llame
"margen potencial".

## Typography

**Display Font:** Manrope (con `'Segoe UI', system-ui, sans-serif`)
**Body Font:** Inter (con `'Segoe UI', system-ui, sans-serif`)
**Label/Mono Font:** `ui-monospace, SFMono-Regular, Menlo, monospace`

**Character:** Manrope aporta el peso geométrico de un título de tapa; Inter
desaparece para que el dato se lea. El mono no es decorativo: es el que declara
que algo es un dato de ficha (kilometraje, año, patente, código, fecha) y no
una frase.

### Hierarchy

- **Display** (700–800, `clamp(38px, 6vw, 76px)`, line-height 1.02, tracking
  -0.02em): sólo el H1 del hero de la home. Uno por sitio.
- **Page Title** (800, `clamp(32px, 5.2vw, 60px)`, line-height 1.05, tracking
  -0.01em): el H1 de toda página interior. Es el token `PAGE_TITLE` de
  `src/lib/design.ts` y es **un solo valor, no un rango**: antes cada página
  inventaba el suyo (42, 44, 48, 56, 60px), lo que leía como cinco niveles de
  jerarquía sin que ninguno lo fuera. Una página ajusta su margen y su color,
  nunca su tamaño. El numeral del 404 (`clamp(60px, 12vw, 140px)`) es la única
  excepción: ahí el número *es* la ilustración, no un título.
- **Headline** (700, `clamp(26px, 3vw, 36px)`, tracking -0.01em): apertura de
  sección y encabezado de bloque. Es el token `H2` de `src/lib/design.ts` y,
  como Page Title, es **un solo valor**: antes había cinco (30, 32, 34, 36,
  38px) repartidos en doce lugares, y el 42px original lo usaba una sola
  sección. Una página ajusta margen y ancho, nunca el tamaño.
- **Lead** (400, `clamp(16px, 1.6vw, 19px)`, line-height 1.6): la bajada que
  sigue a un Display o a un Page Title. Es el único cuerpo que crece con la
  pantalla; el resto del texto corrido se queda en Body.
- **Numeral** (700, `clamp(60px, 12vw, 140px)`): exclusivo del 404. No es un
  título sino la ilustración de la página, y es el único tamaño del sistema por
  encima de Display.
- **Title** (600, 17px): nombre de una tarjeta, de un paso, de una fila.
- **Body** (400, 15px, line-height 1.6): párrafo y descripción.
- **Label** (mono, 11–12px, tracking 0.08–0.12em, MAYÚSCULAS): eyebrows,
  metadatos, badges, encabezados de tabla, etiquetas de placeholder.

### Named Rules

**La Regla del Dato en Mono.** Todo lo que es un dato medible o un código va en
mono, en mayúsculas y con tracking. Todo lo que es una frase va en Inter. La
tipografía dice de qué tipo de información se trata antes de leerla.

**La Regla del Eyebrow Naranja.** El eyebrow (mono 12px, tracking 0.12em) es
uno de los pocos lugares donde el acento aparece como texto. Anuncia la sección
y no se repite dentro de ella.

## Layout

El sistema se reencuadra desde un solo token. `--shell` (1360px) fija el ancho
máximo y `--gutter` colapsa por ancho de pantalla — 28px por defecto, 20px bajo
900px, 16px bajo 560px. Como todas las secciones usan `var(--gutter)`, cambiar
el token reencuadra el sitio entero sin tocar un componente.

Las grillas usan `minmax(min(100%, N), 1fr)` para no desbordar en pantallas
angostas. Las tablas del panel scrollean dentro de su propio contenedor en lugar
de estirar la página. El header mide 76px y tiene dos variantes: `solid`
(sticky, con `backdrop-filter: blur(10px)`) y `overlay` (transparente sobre el
hero, se solidifica a los 40px de scroll).

El ritmo vertical es generoso y editorial: separaciones de sección de 48–80px,
padding interno de tarjeta entre `clamp(12px, 2vw, 20px)` y
`clamp(20px, 4vw, 40px)` según densidad. El panel comprime a
`clamp(16px, 3vw, 24px)` porque es una herramienta de trabajo, no una vidriera.

### Named Rules

**La Regla del Gutter Único.** Ningún componente define su propio margen
horizontal. Si algo necesita alinearse al shell, usa `SHELL` de
`src/lib/design.ts`. Un padding horizontal hardcodeado es un bug.

## Elevation & Depth

El sistema es **plano en reposo**. No hay escala de elevación, no hay sombras
ambientales, no hay capas flotando por defecto. La profundidad se construye con
tres recursos: el contraste entre papel (#faf8f5) y tarjeta (#ffffff), un borde
de 1px, y el aire.

La sombra existe únicamente como **respuesta**: aparece cuando el usuario hace
algo. Es el vocabulario completo del sistema, y es corto a propósito.

### Shadow Vocabulary

- **Lift** (`box-shadow: 0 14px 34px rgba(23,21,18,0.13)`; en oscuro
  `0 14px 34px rgba(0,0,0,0.45)`): la clase `.ui-lift`. Sólo en hover de una
  tarjeta clicable, acompañada de `translateY(-4px)`.
- **Tinte de hover** (`box-shadow: inset 0 0 0 999px var(--hover-tint)`): la
  capa universal de hover. Se pinta *dentro* del elemento porque los colores
  viajan inline en los componentes; así funciona sobre cualquier fondo sin
  conocerlo. Claro: `rgba(23,21,18,0.07)`. Oscuro: `rgba(245,242,238,0.09)`.
- **Halo de foco** (`box-shadow: 0 0 0 3px var(--accent-soft)`): campos con
  foco. En estado inválido cambia a `var(--danger-soft)`.

### Named Rules

**La Regla de la Sombra como Respuesta.** Una sombra sin interacción del usuario
detrás es decoración, y no se usa. Si un elemento necesita destacarse en reposo,
se resuelve con contraste de superficie o con borde, nunca con sombra.

## Shapes

El lenguaje de forma es **recto**. El radio por defecto es 0px: tarjetas,
campos, tablas, secciones y contenedores tienen esquinas vivas. La única
concesión es un radio hairline de 2px en botones y badges — suficiente para que
no corten, insuficiente para leerse como "redondeado". El 50% se reserva a lo
que es genuinamente circular: avatares, puntos de estado, indicadores de paso.

Los bordes son siempre de 1px. No hay bordes de 2px, no hay bordes punteados,
no hay dobles líneas.

El marcador de fotos (mientras no haya fotos reales del stock) es un patrón de
bandas diagonales alternadas a 135° — 18px de banda, 36px de repetición — que
gira a 45° para la segunda foto de una tarjeta. Es honesto: se ve como lo que
es, un espacio reservado, y no simula una imagen.

### Named Rules

**La Regla de la Esquina Viva.** 0px es el default y 2px es el techo. Cualquier
radio mayor pertenece a otro sistema de diseño. La única excepción es el 50%
en elementos circulares reales.

## Components

### Buttons

- **Shape:** esquinas casi vivas (2px), sin borde en las variantes llenas.
- **Primary:** fondo Naranja Óxido, texto #f5f2ee, padding 15px, peso 600.
  Hover a Óxido Profundo (#b34a05).
- **Invert:** fondo Tinta, texto papel claro, padding 14px. Es el CTA del header
  y de los bloques donde el naranja ya está ocupado.
- **Ghost:** borde 1px, fondo transparente, texto Tinta, padding 13px 24px.
- **Hover / Focus:** todos reciben el tinte inset universal; `:active` baja
  1px (`translateY(1px)`). El foco es `outline: 2px solid var(--accent)` con
  `outline-offset: 2px`.
- **Disabled:** `cursor: not-allowed`. El botón de envío de un formulario nace
  deshabilitado y sólo se habilita cuando `fieldsValid([...])` pasa.

### Cards / Containers

- **Corner Style:** 0px.
- **Background:** #ffffff sobre el papel del fondo.
- **Border:** 1px `var(--border)`.
- **Shadow Strategy:** ninguna en reposo; `.ui-lift` en hover si es clicable.
- **Internal Padding:** `clamp(12px, 2vw, 20px)` en denso,
  `clamp(20px, 4vw, 40px)` en editorial.

### Inputs / Fields

- **Style:** borde 1px, fondo `var(--bg)`, radio 0px, padding 13px 14px
  (10px 12px en la variante compacta del panel), 14px de tipografía.
- **Focus:** el borde pasa a Naranja Óxido y se agrega un halo de 3px en Óxido
  Papel. Sin outline nativo.
- **Error:** `aria-invalid="true"` pinta el borde en Rojo Alerta y el halo en
  Rojo Suave. El motivo se muestra bajo el campo, en texto, nunca sólo en color.
- **Comportamiento:** cada campo declara un `kind` (`src/lib/fields.ts`) que
  recorta lo tipeable en tiempo real, valida al salir del foco y fija el teclado
  móvil correcto.

### Chips (píldoras de estado)

- **Style:** radio 0px, padding 3px 8px, 11px peso 600, `white-space: nowrap`.
- **Color:** fondo tenue + texto saturado del mismo matiz semántico. Cada tema
  tiene su par (`bgLight` / `bgDark`); nunca se reusa el mismo fondo en ambos.
- **En el sitio público** el badge de estado sobre una foto invierte el patrón:
  fondo sólido semitransparente y texto claro en mono mayúsculas.

### Navigation

- **Header:** 76px, mono/Inter según el ítem, `backdrop-filter: blur(10px)`
  cuando es sólido. La variante `overlay` monta sobre el hero en transparente
  con texto claro fijo (#f5f2ee) y se solidifica a los 40px de scroll.
- **Mobile:** bajo 860px colapsa a un panel que entra con `slide-in-left`.
- **Activo:** el ítem de la ruta actual toma el acento.

### Vehicle Card (componente firma)

La tarjeta de vehículo es donde el sistema se declara. Foto (o marcador de
bandas) que revela una segunda imagen al hover; badge de estado en mono
mayúsculas en la esquina superior izquierda; ficha de datos en mono; y un CTA
que se desplaza 5px a la derecha cuando el mouse entra en la tarjeta. El
conjunto se levanta 4px con `.ui-lift`. Ningún otro componente combina los
cuatro gestos.

### Named Rules

**La Regla del Color Inline.** Los componentes llevan sus colores inline, por
herencia del prototipo. Por eso los estados globales (hover, foco, inválido) se
pintan con `box-shadow: inset` y con `!important` puntual en `globals.css`:
funcionan sobre cualquier fondo sin conocerlo. Un estado nuevo se resuelve con
ese mecanismo, no agregando una clase de color.

## Do's and Don'ts

### Do:

- **Do** usar `var(--gutter)` y `SHELL` para todo encuadre horizontal.
- **Do** poner en mono mayúsculas con tracking todo dato medible o código
  (km, año, patente, fecha, ID).
- **Do** mantener 0px de radio; 2px sólo en botones y badges.
- **Do** resolver el hover con el tinte inset (`--hover-tint`), que funciona
  sobre colores inline.
- **Do** acompañar todo estado de error con texto, no sólo con color.
- **Do** definir cada token nuevo en `globals.css` para los dos temas a la vez.
- **Do** dejar el botón de envío deshabilitado hasta que los campos obligatorios
  validen.
- **Do** respetar `prefers-reduced-motion`: el bloque ya neutraliza animaciones
  y el lift; cualquier movimiento nuevo entra por ahí.

### Don't:

- **Don't** usar #ffffff como fondo de página. El papel es #faf8f5 (público) o
  #f6f5f2 (panel).
- **Don't** agregar sombras en reposo. La sombra es respuesta a una acción.
- **Don't** superar el 10% de Naranja Óxido en una pantalla, ni usarlo dos veces
  en el mismo bloque.
- **Don't** introducir radios de 4px, 8px o mayores: pertenecen a otro sistema.
- **Don't** agregar un tercer color de acento. Los estados semánticos clasifican;
  no son acentos de marca.
- **Don't** usar gradientes decorativos. El único gradiente legítimo del sistema
  es el patrón de bandas del marcador de fotos y el barrido del skeleton.
- **Don't** hardcodear un hex donde existe un token; el tema oscuro se rompe en
  silencio.
- **Don't** simular fotos reales. Mientras no existan, el marcador de bandas se
  ve como lo que es.
