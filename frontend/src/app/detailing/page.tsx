import type { Metadata } from 'next';
import Link from 'next/link';
import { DarkToggle } from '@/components/site/DarkToggle';
import { HeroVideo } from '@/components/site/HeroVideo';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { EYEBROW, H2, PAGE_TITLE, SHELL } from '@/lib/design';
import { listServices } from '@/server/store';

export const metadata: Metadata = {
  title: 'Detailing',
  description: 'Detailing — 5848 Motors, Mar del Plata.',
};

export default function DetailingPage() {
  const services = listServices();

  return (
    <div style={{ minHeight: '100vh' }}>
      <SiteHeader active="/detailing" />

      {/* HERO */}
      <section
        style={{
          position: 'relative',
          height: 'min(70vh, 560px)',
          minHeight: 420,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <HeroVideo
          src="/uploads/Sports_sedan_detailing_sequence_202609040815.mp4"
          overlay="linear-gradient(180deg, rgba(16,15,13,0.4) 0%, rgba(16,15,13,0.78) 100%)"
        />
        <div style={{ ...SHELL, position: 'relative', zIndex: 2, padding: '0 var(--gutter) 72px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.14em',
              color: 'rgba(245,242,238,0.65)',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Detailing
          </div>
          <h1
            style={{
              ...PAGE_TITLE,
              color: '#F5F2EE',
              margin: '0 0 24px',
              maxWidth: 640,
            }}
          >
            Cuidamos cada detalle.
          </h1>
          <Link
            href="/detailing/turno"
            style={{
              background: '#F5F2EE',
              color: '#171512',
              padding: '16px 30px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 2,
              display: 'inline-flex',
            }}
          >
            Reservar turno
          </Link>
        </div>
      </section>

      {/* SERVICIOS */}
      <section style={{ ...SHELL, padding: '96px var(--gutter)' }}>
        <div style={EYEBROW}>Servicios</div>
        <h2 style={{ ...H2, margin: '0 0 48px', maxWidth: 640 }}>
          Un servicio pensado para cada necesidad.
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            borderTop: '1px solid var(--border)',
          }}
        >
          {services.map((service) => (
            <Link
              key={service.id}
              href="/detailing/turno"
              className="ui-row"
              style={{
                borderBottom: '1px solid var(--border)',
                borderInlineEnd: '1px solid var(--border)',
                marginInlineEnd: -1,
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 180,
                color: 'var(--ink)',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 18,
                    marginBottom: 10,
                  }}
                >
                  {service.name}
                </div>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  {service.desc}
                </p>
              </div>
              {/*
                Antes eran seis "Consultar" en naranja y ninguno clickeable. La
                tarjeta entera es el enlace y el acento queda para el CTA real.
              */}
              <div
                style={{
                  marginTop: 18,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                }}
              >
                Reservar turno →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ ...SHELL, padding: '0 var(--gutter) 128px' }}>
        <div
          style={{
            border: '1px solid var(--border)',
            padding: 'clamp(40px, 6vw, 80px)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 32,
          }}
        >
          <div style={{ maxWidth: 520 }}>
            <h2 style={{ ...H2, margin: '0 0 12px' }}>
              ¿Coordinamos un turno?
            </h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0 }}>
              Elegí el servicio, la fecha y el horario que mejor te queden.
            </p>
          </div>
          <Link
            href="/detailing/turno"
            style={{
              background: 'var(--invert-bg)',
              color: 'var(--invert-ink)',
              padding: '16px 32px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}
          >
            Reservar turno →
          </Link>
        </div>
      </section>

      <SiteFooter />
      <DarkToggle />
    </div>
  );
}
