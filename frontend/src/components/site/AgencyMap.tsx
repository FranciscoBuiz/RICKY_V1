import type { CSSProperties } from 'react';

export const AGENCY_ADDRESS = 'Gaboto 5848, Mar del Plata, Buenos Aires, Argentina';

const MAP_QUERY = encodeURIComponent(AGENCY_ADDRESS);
const EMBED_SRC = `https://www.google.com/maps?q=${MAP_QUERY}&hl=es&z=16&output=embed`;
export const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`;

interface AgencyMapProps {
  /** Alto del mapa; acepta cualquier valor CSS. */
  height?: number | string;
  style?: CSSProperties;
}

/**
 * Mapa de la agencia. Usa el embed público de Google Maps (no necesita API key)
 * y deja un enlace para abrir la ubicación en la app de mapas del visitante.
 */
export function AgencyMap({ height = 380, style }: AgencyMapProps) {
  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid var(--border)',
        background: 'var(--placeholder-a)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <iframe
        title={`Mapa — ${AGENCY_ADDRESS}`}
        src={EMBED_SRC}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        style={{ display: 'block', width: '100%', height, border: 0 }}
      />
      <a
        href={MAP_LINK}
        target="_blank"
        rel="noreferrer"
        className="ui-btn"
        style={{
          position: 'absolute',
          right: 14,
          bottom: 14,
          background: 'var(--invert-bg)',
          color: 'var(--invert-ink)',
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 2,
        }}
      >
        Cómo llegar →
      </a>
    </div>
  );
}
