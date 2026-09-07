import type { Metadata } from 'next';
import Link from 'next/link';
import { DarkToggle } from '@/components/site/DarkToggle';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { EYEBROW, H2, PAGE_TITLE, PLACEHOLDER_LABEL, SHELL, photoPanel } from '@/lib/design';
import { processSteps } from '@/server/data/crm';

export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'Quiénes somos — 5848 Motors, Mar del Plata.',
};

const PILLARS = [
  {
    eyebrow: 'Selección',
    title: 'Vehículos revisados',
    body: 'Cada unidad que publicamos pasa por una revisión antes de salir a la venta.',
  },
  {
    eyebrow: 'Atención',
    title: 'Trato personalizado',
    body: 'Te acompañamos en cada paso, sin apuros ni presión.',
  },
  {
    eyebrow: 'Ubicación',
    title: 'Gaboto 5848',
    body: 'En Mar del Plata, con showroom para conocer los vehículos en persona.',
  },
];

export default function NosotrosPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <SiteHeader active="/nosotros" />

      <section style={{ ...SHELL, padding: '96px var(--gutter) 64px' }}>
        <div style={{ ...EYEBROW, marginBottom: 20 }}>Nosotros</div>
        <h1
          style={{
            ...PAGE_TITLE,
            maxWidth: 900,
          }}
        >
          Comprar un auto debería sentirse diferente.
        </h1>
      </section>

      <section
        style={{
          ...SHELL,
          padding: '0 var(--gutter) 96px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 56,
        }}
      >
        <div style={{ ...photoPanel(), aspectRatio: '4 / 3' }}>
          <span style={PLACEHOLDER_LABEL}>[ foto — showroom / local ]</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, margin: '0 0 18px' }}>
            Quiénes somos
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-strong)', margin: '0 0 20px' }}>
            Somos una agencia de Mar del Plata dedicada a la compra y venta de vehículos usados y 0km.
            Trabajamos con un stock seleccionado y acompañamos cada operación de cerca, desde la primera
            consulta hasta la entrega.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-strong)', margin: 0 }}>
            Además de la venta, ofrecemos permuta, consignación y compra de vehículos, y contamos con un
            servicio propio de detailing para dejar cada auto en su mejor estado.
          </p>
        </div>
      </section>

      <section style={{ background: '#171512', color: '#F5F2EE', padding: '96px var(--gutter)' }}>
        <div style={{ maxWidth: 'var(--shell)', margin: '0 auto' }}>
          <h2 style={{ ...H2, margin: '0 0 56px', maxWidth: 620 }}>
            Cómo trabajamos
          </h2>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40 }}
          >
            {processSteps.map((step) => (
              <div key={step.n} style={{ borderTop: '1px solid rgba(245,242,238,0.18)', paddingTop: 24 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'rgba(245,242,238,0.4)',
                    marginBottom: 14,
                  }}
                >
                  {step.n}
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{step.label}</div>
                <div style={{ fontSize: 14, color: 'rgba(245,242,238,0.6)', lineHeight: 1.5 }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          ...SHELL,
          padding: '96px var(--gutter)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 48,
        }}
      >
        {PILLARS.map((pillar) => (
          <div key={pillar.eyebrow}>
            <div style={{ ...EYEBROW, letterSpacing: '0.1em', marginBottom: 14 }}>{pillar.eyebrow}</div>
            <h3
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '0 0 12px' }}
            >
              {pillar.title}
            </h3>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{pillar.body}</p>
          </div>
        ))}
      </section>

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
          <h2 style={{ ...H2, maxWidth: 480 }}>
            ¿Querés conocer nuestro stock actual?
          </h2>
          <Link
            href="/catalogo"
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
            Ver vehículos →
          </Link>
        </div>
      </section>

      <SiteFooter />
      <DarkToggle />
    </div>
  );
}
