import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}

/**
 * Bloque gris con brillo en movimiento. Reemplaza al contenido mientras la
 * pantalla espera al servidor, para que el layout no salte al llegar los datos.
 */
export function Skeleton({ width = '100%', height = 14, radius = 2, style }: SkeletonProps) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

interface SkeletonTableProps {
  /** Filas a dibujar. */
  rows?: number;
  /** Altura de cada fila. */
  rowHeight?: number;
  /** Dibuja una fila más clara arriba a modo de encabezado. */
  header?: boolean;
}

/** Esqueleto de una tabla del panel (encabezado + filas). */
export function SkeletonTable({ rows = 6, rowHeight = 44, header = true }: SkeletonTableProps) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      {header && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <Skeleton width="22%" height={11} />
        </div>
      )}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} height={rowHeight} />
        ))}
      </div>
    </div>
  );
}

/** Esqueleto de una tarjeta con título, subtítulo y cuerpo. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Skeleton width="45%" height={13} />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} height={index === lines - 1 ? 14 : 34} width={index === lines - 1 ? '70%' : '100%'} />
      ))}
    </div>
  );
}
