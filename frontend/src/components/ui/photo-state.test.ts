import { describe, expect, it } from 'vitest';
import {
  initialPhotoState,
  photoLayers,
  resolveMountedState,
  shouldReportFailure,
} from '@/components/ui/photo-state';

describe('initialPhotoState', () => {
  it('sin fuente no hay nada que esperar: el cuadro está vacío, no cargando', () => {
    expect(initialPhotoState(undefined)).toBe('absent');
    expect(initialPhotoState(null)).toBe('absent');
    expect(initialPhotoState('')).toBe('absent');
  });

  it('con fuente arranca esperando los bytes', () => {
    expect(initialPhotoState('/vehiculos/etios17/01.jpg')).toBe('loading');
  });
});

describe('resolveMountedState', () => {
  /*
   * El caso que justifica todo este archivo. Si el navegador ya tiene la foto
   * en caché, la termina antes de que React monte el `onLoad`, el evento no
   * dispara nunca y el shimmer se queda pegado para siempre. Al montar hay que
   * preguntarle al elemento qué pasó sin nosotros.
   */
  it('una foto ya cacheada está cargada aunque onLoad nunca haya disparado', () => {
    expect(resolveMountedState('loading', { complete: true, naturalWidth: 1600 })).toBe('loaded');
  });

  it('completa pero sin ancho real es una foto que falló', () => {
    expect(resolveMountedState('loading', { complete: true, naturalWidth: 0 })).toBe('failed');
  });

  it('todavía incompleta sigue esperando, que es para lo que existe el shimmer', () => {
    expect(resolveMountedState('loading', { complete: false, naturalWidth: 0 })).toBe('loading');
  });

  it('sin elemento montado no inventa un estado nuevo', () => {
    expect(resolveMountedState('loading', null)).toBe('loading');
    expect(resolveMountedState('absent', null)).toBe('absent');
  });

  it('no pisa un estado ya resuelto por los eventos', () => {
    expect(resolveMountedState('loaded', { complete: false, naturalWidth: 0 })).toBe('loaded');
    expect(resolveMountedState('failed', { complete: true, naturalWidth: 900 })).toBe('failed');
  });

  it('sin fuente el elemento no dice nada: sigue ausente', () => {
    expect(resolveMountedState('absent', { complete: true, naturalWidth: 0 })).toBe('absent');
  });
});

describe('photoLayers', () => {
  it('mientras baja, la foto está en el DOM pero invisible y el shimmer tapa el hueco', () => {
    expect(photoLayers('loading')).toEqual({
      image: true,
      imageOpacity: 0,
      shimmer: true,
      stripes: false,
    });
  });

  it('cargada, se ve la foto y nada más', () => {
    expect(photoLayers('loaded')).toEqual({
      image: true,
      imageOpacity: 1,
      shimmer: false,
      stripes: false,
    });
  });

  /*
   * Los dos casos que terminan en bandas son distintos para nosotros pero
   * idénticos para el visitante: no tiene por qué enterarse de si la agencia no
   * subió la foto o si el archivo se rompió.
   */
  it('sin foto y con foto rota se ven igual: bandas, sin shimmer', () => {
    expect(photoLayers('absent')).toEqual(photoLayers('failed'));
    expect(photoLayers('absent').stripes).toBe(true);
    expect(photoLayers('absent').shimmer).toBe(false);
  });

  it('una foto rota no deja el <img> en el DOM, para no mostrar el ícono roto', () => {
    expect(photoLayers('failed').image).toBe(false);
  });
});

describe('shouldReportFailure', () => {
  it('reporta una foto rota la primera vez', () => {
    const vistas = new Set<string>();
    expect(shouldReportFailure('/vehiculos/fox17/03.jpg', vistas)).toBe(true);
  });

  /*
   * Una tarjeta rota que entra y sale del viewport al hacer scroll dispara
   * `onError` cada vez. Sin esto, una sola foto muerta manda cien eventos a
   * Sentry en un scroll y tapa todo lo demás.
   */
  it('no vuelve a reportar la misma foto', () => {
    const vistas = new Set<string>();
    shouldReportFailure('/vehiculos/fox17/03.jpg', vistas);
    expect(shouldReportFailure('/vehiculos/fox17/03.jpg', vistas)).toBe(false);
  });

  it('cada foto rota distinta se reporta una vez', () => {
    const vistas = new Set<string>();
    expect(shouldReportFailure('/a.jpg', vistas)).toBe(true);
    expect(shouldReportFailure('/b.jpg', vistas)).toBe(true);
    expect(shouldReportFailure('/a.jpg', vistas)).toBe(false);
  });
});
