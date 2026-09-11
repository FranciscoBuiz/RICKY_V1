import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: '5848 Motors — Vehículos usados y 0km en Mar del Plata',
    template: '%s — 5848 Motors',
  },
  description: '5848 Motors — Vehículos usados y 0km en Mar del Plata. Gaboto 5848.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/*
          La foto sale del servidor con `opacity: 0` esperando su `onLoad`, y el
          shimmer encima. Sin JavaScript ese evento no llega nunca y la ficha
          —que es prerenderizada y antes se veía igual— quedaría con las fotos
          invisibles para siempre. Acá se revierten las dos cosas de una.
        */}
        <noscript>
          <style>{'.photo-img{opacity:1!important}.photo-shimmer{display:none!important}'}</style>
        </noscript>
      </head>
      <body
        className={`${manrope.variable} ${inter.variable}`}
        style={
          {
            '--font-display': `var(--font-manrope), 'Segoe UI', system-ui, sans-serif`,
            '--font-body': `var(--font-inter), 'Segoe UI', system-ui, sans-serif`,
          } as React.CSSProperties
        }
      >
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
</body>
    </html>
  );
}
