import type { Metadata } from 'next';
import Link from 'next/link';
import { PAGE_TITLE } from '@/lib/design';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  description: 'Página no encontrada — 5848 Motors.',
};

export default function NotFound() {
  return (
    <div
      style={{
        color: '#F5F2EE',
        background: '#171512',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 28px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          letterSpacing: '0.14em',
          color: 'rgba(245,242,238,0.5)',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}
      >
        Error 404
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(60px, 12vw, 140px)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: 'rgba(245,242,238,0.9)',
          marginBottom: 24,
        }}
      >
        404
      </div>
      <h1 style={{ ...PAGE_TITLE, margin: '0 0 14px', maxWidth: 560 }}>
        Parece que doblaste en la dirección equivocada.
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(245,242,238,0.6)', margin: '0 0 36px', maxWidth: 440 }}>
        La página que buscás no existe o cambió de lugar.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            background: '#F5F2EE',
            color: '#171512',
            padding: '15px 28px',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Volver al inicio
        </Link>
        <Link
          href="/catalogo"
          style={{
            border: '1px solid rgba(245,242,238,0.35)',
            color: '#F5F2EE',
            padding: '15px 28px',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Ver vehículos
        </Link>
      </div>
    </div>
  );
}
