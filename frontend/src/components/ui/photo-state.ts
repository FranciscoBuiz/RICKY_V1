/*
 * Estado de carga de una foto, separado de la vista porque el runner de tests
 * corre con `environment: 'node'` e `include: ['src/**\/*.test.ts']`: no puede
 * importar un `.tsx`. Mismo criterio que `admin/vehiculos/margen.ts`.
 */

/**
 * - `absent`: no hay foto que mostrar (la agencia todavía no la subió).
 * - `loading`: hay fuente y los bytes están en camino.
 * - `loaded`: la foto se ve.
 * - `failed`: había fuente pero el archivo no llegó (404, red cortada).
 */
export type PhotoState = 'absent' | 'loading' | 'loaded' | 'failed';

/** Lo mínimo que necesitamos de un `<img>` real; así el test no monta un DOM. */
export interface PhotoElementSnapshot {
  complete: boolean;
  naturalWidth: number;
}

/** Sin fuente no hay nada que esperar: el cuadro está vacío, no cargando. */
export function initialPhotoState(src: string | null | undefined): PhotoState {
  return src ? 'loading' : 'absent';
}

/**
 * Lo que el elemento ya sabe antes de disparar ningún evento.
 *
 * Existe por la foto cacheada: el navegador la termina antes de que React monte
 * el `onLoad`, con lo cual ese evento no dispara nunca y el shimmer se queda
 * pegado para siempre. Al montar hay que preguntarle al elemento qué pasó sin
 * nosotros. `complete` con `naturalWidth` en 0 es la forma que tiene el DOM de
 * decir "terminé, y no hay imagen".
 */
export function resolveMountedState(
  previo: PhotoState,
  elemento: PhotoElementSnapshot | null,
): PhotoState {
  if (previo !== 'loading') return previo;
  if (!elemento || !elemento.complete) return previo;
  return elemento.naturalWidth > 0 ? 'loaded' : 'failed';
}

export interface PhotoLayers {
  /** Si el `<img>` va al DOM. Mientras carga tiene que estar, o no carga nunca. */
  image: boolean;
  /** Opacidad del `<img>`: aparece recién cuando terminó. */
  imageOpacity: 0 | 1;
  /** El gris con brillo que barre: sólo mientras se espera. */
  shimmer: boolean;
  /** Las bandas diagonales del diseño: cuando no va a haber foto. */
  stripes: boolean;
}

/**
 * Única fuente de verdad de qué se dibuja en cada estado.
 *
 * `absent` y `failed` dan lo mismo a propósito: para nosotros son distintos,
 * para el visitante no tiene por qué serlo. Y `failed` saca el `<img>` del DOM
 * para que el navegador no dibuje su ícono de imagen rota, que es más feo que
 * cualquier marcador propio.
 */
export function photoLayers(state: PhotoState): PhotoLayers {
  switch (state) {
    case 'loading':
      return { image: true, imageOpacity: 0, shimmer: true, stripes: false };
    case 'loaded':
      return { image: true, imageOpacity: 1, shimmer: false, stripes: false };
    case 'absent':
    case 'failed':
      return { image: false, imageOpacity: 0, shimmer: false, stripes: true };
  }
}

/**
 * Una tarjeta rota que entra y sale del viewport dispara `onError` cada vez.
 * Sin deduplicar, una sola foto muerta manda cien eventos a Sentry en un scroll
 * y tapa todo lo demás. Muta el set a propósito: es el registro de la sesión.
 */
export function shouldReportFailure(src: string, yaReportadas: Set<string>): boolean {
  if (yaReportadas.has(src)) return false;
  yaReportadas.add(src);
  return true;
}
