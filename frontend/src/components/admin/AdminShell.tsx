'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { DarkToggle } from '@/components/site/DarkToggle';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/api';
import { pillStyle, rolPill } from '@/lib/design';
import { useIsNarrow } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import type { PanelUser } from '@/types';

export const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Vehículos', href: '/admin/vehiculos' },
  { label: 'Detailing', href: '/admin/detailing' },
  { label: 'Consultas', href: '/admin/consultas' },
  { label: 'Configuración', href: '/admin/configuracion' },
];

const SIDEBAR_WIDTH = 232;

interface AdminShellProps {
  /** Etiqueta del ítem de navegación activo. */
  active: string;
  /** Contenido central del topbar (título o breadcrumb). */
  title: React.ReactNode;
  /** Acciones a la derecha del topbar. */
  actions?: React.ReactNode;
  /**
   * Quien esta conectado. Opcional porque `/admin/dashboard-v1` monta el shell
   * sin sesion: es una maqueta de comparacion, no una pantalla del panel.
   */
  usuario?: PanelUser;
  children: React.ReactNode;
}

export function AdminShell({ active, title, actions, usuario, children }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsNarrow(900);
  const { dark } = useTheme();
  const toast = useToast();
  const [saliendo, setSaliendo] = useState(false);

  // Al pasar a escritorio el cajón deja de tener sentido: la barra vuelve a
  // estar siempre a la vista.
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [drawerOpen]);

  /**
   * En escritorio la barra es `sticky` a `top: 0` con alto de viewport, así que
   * acompaña el scroll del contenido en lugar de quedar anclada al inicio de la
   * página. En mobile es un cajón fijo sobre el contenido.
   */
  const sidebarStyle: CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        zIndex: 95,
        overflowY: 'auto',
      }
    : {
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        height: '100vh',
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        overflowY: 'auto',
      };

  async function cerrarSesion() {
    setSaliendo(true);
    try {
      await apiSend('/api/auth/logout', 'POST');
    } catch (error) {
      /* La sesión sigue viva: mandarlo a /login le haría creer que salió. Se
         queda donde está y se le dice qué pasó. */
      setSaliendo(false);
      toast.error(
        'No pudimos cerrar tu sesión',
        error instanceof Error ? error.message : 'Probá de nuevo en un momento.',
      );
      return;
    }

    /* Navegación dura y no `router.replace`: hay que tirar el caché del router y
       todo el estado cliente del panel. Una navegación blanda puede repintar una
       pantalla con datos de la sesión que acaba de morir. */
    window.location.assign('/login');
  }

  const sidebar = (
    <aside
      className={isMobile ? 'slide-in-left' : undefined}
      style={{
        ...sidebarStyle,
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ padding: '8px 10px 20px' }}>
        <Link
          href="/"
          className="ui-link"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 16,
            color: 'var(--ink)',
          }}
        >
          5848<span style={{ color: 'var(--accent)', fontSize: 11 }}> MOTORS</span>
        </Link>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Panel de administración</div>
      </div>

      {ADMIN_NAV.map((item) => {
        const isActive = item.label === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="ui-btn"
            onClick={() => setDrawerOpen(false)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              padding: '10px 12px',
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--ink)' : 'var(--muted)',
              background: isActive ? 'var(--bg)' : 'none',
              borderRadius: 3,
            }}
          >
            {item.label}
          </Link>
        );
      })}

      {usuario && (
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={cerrarSesion}
            disabled={saliendo}
            className="ui-btn"
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'none',
              padding: '10px 12px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--muted)',
              cursor: saliendo ? 'progress' : 'pointer',
              borderRadius: 3,
            }}
          >
            {saliendo ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <div className="admin-surface" style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {!isMobile && sidebar}

      {isMobile && drawerOpen && (
        <>
          <div
            role="presentation"
            onClick={() => setDrawerOpen(false)}
            className="fadein"
            style={{ position: 'fixed', inset: 0, background: 'rgba(16,15,13,0.45)', zIndex: 94 }}
          />
          {sidebar}
        </>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            minHeight: 60,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '10px 16px' : '0 24px',
            background: 'var(--card)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setDrawerOpen((open) => !open)}
                aria-expanded={drawerOpen}
                aria-label="Abrir navegación"
                style={{
                  border: '1px solid var(--border)',
                  background: 'none',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                Menú
              </button>
            )}
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {usuario && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {/* En mobile queda solo el pill: el nombre y el boton de alta no
                    entran juntos, y de los dos el pill es el que dice algo que no
                    esta en ninguna otra parte de la pantalla. */}
                {!isMobile && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {usuario.name}
                  </span>
                )}
                <span style={pillStyle(rolPill[usuario.role], dark)}>{rolPill[usuario.role].label}</span>
              </div>
            )}
            {actions}
          </div>
        </div>

        {children}
      </div>

      <DarkToggle />
    </div>
  );
}

/** Breadcrumb "Admin / Sección" del topbar. */
export function AdminBreadcrumb({ section }: { section: string }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
      Admin / <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{section}</span>
    </div>
  );
}
