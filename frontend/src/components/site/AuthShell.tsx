import Link from 'next/link';
import { DarkToggle } from '@/components/site/DarkToggle';

/** Marco común de las pantallas de autenticación: logo arriba, tarjeta al centro. */
export function AuthShell({ children, maxWidth = 400 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 28, textAlign: 'center' }}>
        <Link
          href="/"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}
        >
          5848<span style={{ color: 'var(--accent)', fontSize: 13, letterSpacing: '0.06em' }}> MOTORS</span>
        </Link>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 20px 60px',
        }}
      >
        <div style={{ width: '100%', maxWidth }}>{children}</div>
      </div>

      <DarkToggle />
    </div>
  );
}
