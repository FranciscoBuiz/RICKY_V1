'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import {
  initialPhotoState,
  photoLayers,
  resolveMountedState,
  shouldReportFailure,
  type PhotoState,
} from './photo-state';

/** Vive en el módulo, no en el componente: el registro es de toda la sesión. */
const reportadas = new Set<string>();

interface PhotoProps {
  /** Sin fuente el componente dibuja el marcador y no espera nada. */
  src?: string | null;
  alt: string;
  /** Qué se ve cuando no va a haber foto: las bandas del diseño, con su etiqueta. */
  fallback: ReactNode;
  /** Estilo del contenedor. Le toca definir el tamaño del cuadro. */
  style?: CSSProperties;
  /** Estilo de la `<img>`; por defecto llena el contenedor recortando. */
  imgStyle?: CSSProperties;
  className?: string;
  loading?: 'eager' | 'lazy';
  /** Decorativa: sin texto alternativo y fuera del árbol de accesibilidad. */
  decorative?: boolean;
}

/**
 * Una foto con su espera puesta.
 *
 * El shimmer de `.skeleton` ya se usaba para "los datos vienen en camino", pero
 * se apagaba en cuanto llegaba el JSON, justo antes de la otra espera: la de los
 * bytes de la foto. Acá el shimmer se sostiene hasta que la imagen terminó, y
 * recién entonces aparece. Las bandas quedan para lo que siempre significaron:
 * no hay foto.
 */
export function Photo({
  src,
  alt,
  fallback,
  style,
  imgStyle,
  className,
  loading = 'lazy',
  decorative = false,
}: PhotoProps) {
  const [state, setState] = useState<PhotoState>(() => initialPhotoState(src));
  const elemento = useRef<HTMLImageElement | null>(null);

  /*
   * Un solo efecto para dos cosas que pasan juntas: si cambió la foto (galería,
   * miniaturas) se vuelve a esperar desde cero, y si el navegador ya la tenía en
   * caché se resuelve acá, porque su `onLoad` nunca va a disparar.
   */
  useEffect(() => {
    setState(resolveMountedState(initialPhotoState(src), elemento.current));
  }, [src]);

  const alFallar = useCallback(() => {
    setState('failed');
    if (src && shouldReportFailure(src, reportadas)) {
      // Sin DSN, `init` nunca corrió y esto no hace nada.
      Sentry.captureMessage(`Foto que no carga: ${src}`, 'warning');
    }
  }, [src]);

  const capas = photoLayers(state);

  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'block', overflow: 'hidden', ...style }}
    >
      {capas.image && src ? (
        <img
          ref={elemento}
          src={src}
          alt={decorative ? '' : alt}
          aria-hidden={decorative || undefined}
          loading={loading}
          onLoad={() => setState('loaded')}
          onError={alFallar}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: capas.imageOpacity,
            transition: 'opacity 0.3s ease',
            ...imgStyle,
          }}
        />
      ) : null}

      {capas.shimmer ? (
        <span
          className="skeleton"
          aria-hidden
          style={{ position: 'absolute', inset: 0, display: 'block' }}
        />
      ) : null}

      {capas.stripes ? fallback : null}
    </span>
  );
}
