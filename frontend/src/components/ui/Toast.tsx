'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export type ToastTone = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastApi {
  /** Cartel rojo: algo falló y el usuario tiene que enterarse. */
  error: (title: string, detail?: string) => void;
  success: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
  /** Envuelve una promesa: si rompe, muestra el cartel y devuelve `false`. */
  run: <T>(action: () => Promise<T>, fallback: string) => Promise<T | undefined>;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<ToastTone, { bar: string; label: string }> = {
  error: { bar: 'var(--danger)', label: 'Error' },
  success: { bar: 'var(--ok)', label: 'Listo' },
  info: { bar: 'var(--info)', label: 'Info' },
};

const DURATION = 6000;

/**
 * Carteles de aviso globales. Toda la app comparte una sola pila: los errores
 * de red dejan de morir en la consola y el usuario ve qué pasó.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      seq.current += 1;
      const id = seq.current;
      setToasts((current) => [...current.slice(-3), { id, tone, title, detail }]);
      setTimeout(() => dismiss(id), DURATION);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      error: (title, detail) => push('error', title, detail),
      success: (title, detail) => push('success', title, detail),
      info: (title, detail) => push('info', title, detail),
      run: async (action, fallback) => {
        try {
          return await action();
        } catch (error) {
          push('error', fallback, error instanceof Error ? error.message : undefined);
          return undefined;
        }
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          right: 16,
          /* Por encima del botón flotante de tema, que vive en la misma esquina. */
          bottom: 76,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          width: 'min(360px, calc(100vw - 32px))',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="slide-in-right"
            style={{
              ...CARD,
              borderLeft: `3px solid ${TONE[toast.tone].bar}`,
              pointerEvents: 'auto',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{toast.title}</div>
              {toast.detail && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{toast.detail}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar aviso"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: 16,
                lineHeight: 1,
                cursor: 'pointer',
                padding: 2,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const CARD: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  boxShadow: '0 12px 30px rgba(23,21,18,0.16)',
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
};

/**
 * Fuera del provider devuelve una API que no hace nada, así un componente
 * suelto (o un test) no explota por falta de contexto.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  return (
    context ?? {
      error: () => {},
      success: () => {},
      info: () => {},
      run: async (action) => {
        try {
          return await action();
        } catch {
          return undefined;
        }
      },
    }
  );
}
