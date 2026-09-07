'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Fondo en video de un hero.
 *
 * Los dos videos del sitio pesan 9,3 MB y 8,6 MB. Montados directamente en el
 * markup, el navegador los empieza a descargar junto con el HTML y compiten por
 * ancho de banda con el texto del hero, que es lo único que el visitante
 * necesita ver. En un celular con datos móviles —el escenario real del sitio—
 * eso son varios segundos de rectángulo negro.
 *
 * Acá el video no existe hasta después del primer paint, y directamente no se
 * carga cuando el visitante pidió menos movimiento, activó ahorro de datos o
 * está en una conexión lenta. El hero se compone igual sin él: el fondo y el
 * degradado son parte del diseño, no un placeholder a la espera del video.
 */

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

/** `true` si conviene ahorrarle al visitante nueve megas. */
function shouldSkipVideo(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return false;
  if (connection.saveData) return true;

  return connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
}

interface HeroVideoProps {
  src: string;
  /** Degradado que se superpone al video para que el texto se lea. */
  overlay: string;
}

export function HeroVideo({ src, overlay }: HeroVideoProps) {
  const [source, setSource] = useState<string | null>(null);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (shouldSkipVideo()) return;

    // Dos frames de espera: el hero pinta primero, el video pide bytes después.
    frame.current = window.requestAnimationFrame(() => {
      frame.current = window.requestAnimationFrame(() => setSource(src));
    });

    return () => {
      if (frame.current !== undefined) window.cancelAnimationFrame(frame.current);
    };
  }, [src]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#171512', overflow: 'hidden' }}>
      {source && (
        <video
          src={source}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          style={VIDEO}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: overlay }} />
    </div>
  );
}

const VIDEO: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};
