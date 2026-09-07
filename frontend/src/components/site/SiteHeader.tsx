'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { useIsNarrow, useScrolled } from '@/lib/hooks';

export const NAV_LINKS = [
  { href: '/catalogo', label: 'Vehículos' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/detailing', label: 'Detailing' },
  { href: '/vender-mi-auto', label: 'Vendé tu auto' },
  { href: '/contacto', label: 'Contacto' },
];

interface SiteHeaderProps {
  /** Ruta activa, para resaltar el ítem de navegación. */
  active?: string;
  /**
   * `overlay` monta el header transparente sobre el hero y lo solidifica al
   * hacer scroll (Home). `solid` es el header sticky del resto del sitio.
   */
  variant?: 'solid' | 'overlay';
}

export function SiteHeader({ active, variant = 'solid' }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsNarrow(860);
  const scrolled = useScrolled(40);

  const overlay = variant === 'overlay';
  const solidified = !overlay || scrolled;

  const headerStyle: CSSProperties = overlay
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled ? 'var(--header-bg)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }
    : {
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
      };

  // Sobre el hero el texto siempre va en claro; una vez sólido sigue al tema.
  const textColor = solidified ? 'var(--ink)' : '#F5F2EE';

  const ctaStyle: CSSProperties = solidified
    ? {
        background: 'var(--invert-bg)',
        color: 'var(--invert-ink)',
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 600,
        borderRadius: 2,
      }
    : {
        background: 'rgba(245,242,238,0.14)',
        color: '#F5F2EE',
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 600,
        borderRadius: 2,
        border: '1px solid rgba(245,242,238,0.35)',
      };

  return (
    <header style={headerStyle}>
      <div
        style={{
          maxWidth: 'var(--shell)',
          margin: '0 auto',
          padding: '0 var(--gutter)',
          height: 76,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          className="ui-link"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 18,
            color: textColor,
            letterSpacing: '-0.01em',
            transition: 'color 0.25s ease',
          }}
        >
          5848
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em' }}>
            {' '}
            MOTORS
          </span>
        </Link>

        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="ui-link"
                style={{
                  fontSize: 14,
                  fontWeight: active === link.href ? 600 : 500,
                  color: textColor,
                  opacity: solidified ? 1 : 0.92,
                  transition: 'color 0.25s ease',
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/contacto" className="ui-btn" style={ctaStyle}>
              Consultar
            </Link>
          </nav>
        )}

        {isMobile && (
          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            style={{
              width: 40,
              height: 40,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', height: 2, width: 24, background: textColor }} />
            <span style={{ display: 'block', height: 2, width: 24, background: textColor }} />
          </button>
        )}
      </div>

      {isMobile && menuOpen && (
        <div
          className="fadein"
          style={{
            background: 'var(--bg)',
            borderTop: '1px solid var(--border)',
            padding: '8px var(--gutter) 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            /* En pantallas bajas el menú abierto tiene que poder scrollear. */
            maxHeight: 'calc(100vh - 76px)',
            overflowY: 'auto',
          }}
        >
          {NAV_LINKS.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className="ui-link"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '14px 0',
                fontSize: 17,
                color: 'var(--ink)',
                borderBottom: index === NAV_LINKS.length - 1 ? 'none' : '1px solid var(--border)',
              }}
            >
              {link.label}
            </Link>
          ))}
          {overlay && (
            <Link
              href="/contacto"
              className="ui-btn"
              onClick={() => setMenuOpen(false)}
              style={{
                marginTop: 12,
                background: 'var(--accent)',
                color: '#FAF8F5',
                textAlign: 'center',
                padding: 14,
                borderRadius: 2,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Consultar
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
