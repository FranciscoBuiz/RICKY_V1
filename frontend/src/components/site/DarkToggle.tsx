'use client';

import { useTheme } from '@/lib/theme';

/**
 * Botón flotante de modo claro/oscuro, presente en todas las páginas.
 *
 * `offset` lo levanta en las páginas que tienen barra de CTA sticky, para que
 * no se apoye encima del botón de contacto.
 */
export function DarkToggle({ offset = 0 }: { offset?: number } = {}) {
  const { toggle, toggleLabel } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar modo"
      style={{
        position: 'fixed',
        // Debajo de la barra de CTA sticky del móvil (zIndex 60): un switch de
        // tema no puede taparle al visitante el botón de contacto.
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${20 + offset}px)`,
        right: 20,
        zIndex: 55,
        padding: '10px 16px',
        borderRadius: 2,
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {toggleLabel}
    </button>
  );
}
