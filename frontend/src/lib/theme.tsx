'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_STORAGE_KEY = 'm5848_dark';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  dark: boolean;
  toggle: () => void;
  /** Etiqueta del botón: muestra el modo al que se va a cambiar. */
  toggleLabel: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Script que corre antes del primer paint para aplicar el tema guardado y
 * evitar el parpadeo entre claro y oscuro en la hidratación.
 */
export const themeInitScript = `(function(){try{var d=localStorage.getItem('${THEME_STORAGE_KEY}')==='1';document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      setDark(localStorage.getItem(THEME_STORAGE_KEY) === '1');
    } catch {
      /* almacenamiento no disponible: se queda en claro */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignorado */
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: dark ? 'dark' : 'light', dark, toggle, toggleLabel: dark ? 'Claro' : 'Oscuro' }),
    [dark, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
