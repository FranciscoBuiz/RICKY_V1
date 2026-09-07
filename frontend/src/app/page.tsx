import Link from 'next/link';
import { AGENCY_ADDRESS, AgencyMap } from '@/components/site/AgencyMap';
import { DarkToggle } from '@/components/site/DarkToggle';
import { HeroVideo } from '@/components/site/HeroVideo';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { QuickSearch } from '@/components/site/QuickSearch';
import { VehicleCard, VehicleGrid } from '@/components/site/VehicleCard';
import { EYEBROW, H2, PLACEHOLDER_LABEL, SHELL, photoPanel } from '@/lib/design';
import { processSteps } from '@/server/data/crm';
import { brandOptions } from '@/server/data/vehicles';
import { listVehicles, toPublicVehicle } from '@/server/store';

export default function HomePage() {
  const featured = listVehicles({ featured: true }).slice(0, 6).map(toPublicVehicle);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <SiteHeader variant="overlay" />

      {/* HERO */}
      <section
        style={{
          position: 'relative',
          height: 'min(96vh, 880px)',
          minHeight: 560,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <HeroVideo
          src="/uploads/Cars_driving_in_studio_sequence_202609040808.mp4"
          overlay="linear-gradient(180deg, rgba(16,15,13,0.45) 0%, rgba(16,15,13,0.78) 100%)"
        />

        {/* Marcas de encuadre tipo HUD */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 28,
            width: 22,
            height: 22,
            borderLeft: '1px solid rgba(245,242,238,0.4)',
            borderTop: '1px solid rgba(245,242,238,0.4)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 100,
            right: 28,
            width: 22,
            height: 22,
            borderRight: '1px solid rgba(245,242,238,0.4)',
            borderTop: '1px solid rgba(245,242,238,0.4)',
          }}
        />

        <div className="reveal" style={{ ...SHELL, position: 'relative', zIndex: 2, padding: '0 var(--gutter) 88px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.14em',
              color: 'rgba(245,242,238,0.65)',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Mar del Plata · Gaboto 5848
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(38px, 6vw, 76px)',
              lineHeight: 1.02,
              letterSpacing: '-0.01em',
              color: '#F5F2EE',
              margin: '0 0 22px',
              maxWidth: 780,
            }}
          >
            Encontrá el auto que estás buscando.
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 1.6vw, 19px)',
              color: 'rgba(245,242,238,0.82)',
              maxWidth: 560,
              lineHeight: 1.5,
              margin: '0 0 36px',
            }}
          >
            Vehículos seleccionados, asesoramiento personalizado y una experiencia diferente para comprar y
            vender tu próximo auto.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link
              href="/catalogo"
              className="ui-btn"
              style={{
                background: '#F5F2EE',
                color: '#171512',
                padding: '16px 30px',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                letterSpacing: '0.01em',
              }}
            >
              Ver vehículos
            </Link>
            <Link
              href="/vender-mi-auto"
              className="ui-btn"
              style={{
                border: '1px solid rgba(245,242,238,0.5)',
                color: '#F5F2EE',
                padding: '16px 30px',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Vendé tu auto
            </Link>
          </div>
        </div>
      </section>

      {/* BÚSQUEDA RÁPIDA */}
      <section style={{ ...SHELL, margin: '-34px auto 0', position: 'relative', zIndex: 3 }}>
        <QuickSearch brands={brandOptions} />
      </section>

      {/* STOCK DESTACADO */}
      <section style={{ ...SHELL, padding: 'clamp(72px, 10vw, 128px) var(--gutter) clamp(56px, 7vw, 96px)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
            marginBottom: 48,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={EYEBROW}>01 — Stock</div>
            <h2 style={H2}>Vehículos destacados</h2>
          </div>
          <Link href="/catalogo" className="link-underline">
            Ver todo el stock →
          </Link>
        </div>

        <VehicleGrid>
          {featured.map((vehicle, index) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
          ))}
        </VehicleGrid>
      </section>

      {/* CÓMO TRABAJAMOS */}
      <section
        style={{ background: '#171512', color: '#F5F2EE', padding: 'clamp(64px, 9vw, 112px) var(--gutter)' }}
      >
        <div style={{ maxWidth: 'var(--shell)', margin: '0 auto' }}>
          <div style={EYEBROW}>02 — Cómo trabajamos</div>
          <h2 style={{ ...H2, margin: '0 0 64px', maxWidth: 640 }}>
            Comprar un auto debería sentirse diferente.
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 40,
            }}
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
                <div style={{ fontSize: 17, fontWeight: 600 }}>{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DETAILING */}
      <section
        style={{
          ...SHELL,
          padding: 'clamp(64px, 9vw, 112px) var(--gutter)',
          display: 'grid',
          /* `min(100%, …)` evita que la grilla desborde en pantallas angostas. */
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(28px, 4vw, 56px)',
          alignItems: 'center',
        }}
      >
        <div style={{ ...photoPanel(), aspectRatio: '5 / 4' }}>
          <span style={PLACEHOLDER_LABEL}>[ foto — detailing ]</span>
        </div>
        <div>
          <div style={EYEBROW}>03 — Detailing</div>
          <h2 style={{ ...H2, margin: '0 0 20px' }}>
            Cuidamos cada detalle.
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--ink-strong)',
              maxWidth: 460,
              margin: '0 0 28px',
            }}
          >
            Lavado premium, tratamiento exterior e interior, pulido y protección. Para tu auto o el que estás
            preparando para vender.
          </p>
          <Link href="/detailing" className="link-underline">
            Conocer el servicio →
          </Link>
        </div>
      </section>

      {/* VENDER */}
      <section style={{ ...SHELL, padding: '0 var(--gutter) clamp(72px, 9vw, 112px)' }}>
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
          <div style={{ maxWidth: 560 }}>
            <div style={EYEBROW}>04 — Vender</div>
            <h2 style={{ ...H2, margin: '0 0 14px' }}>
              ¿Querés vender tu auto?
            </h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0 }}>
              Contanos sobre tu vehículo y nos ponemos en contacto con vos.
            </p>
          </div>
          <Link
            href="/vender-mi-auto"
            className="ui-btn"
            style={{
              background: '#171512',
              color: '#F5F2EE',
              padding: '16px 32px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}
          >
            Empezar →
          </Link>
        </div>
      </section>

      {/* DÓNDE ESTAMOS */}
      <section style={{ ...SHELL, padding: '0 var(--gutter) clamp(72px, 9vw, 128px)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'clamp(28px, 4vw, 40px)',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={EYEBROW}>05 — Dónde estamos</div>
            <h2 style={{ ...H2, margin: '0 0 16px' }}>
              Te esperamos en Gaboto 5848.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-strong)', margin: '0 0 24px' }}>
              {AGENCY_ADDRESS}. Vení a conocer el stock en persona o coordiná una visita por WhatsApp.
            </p>
            <Link href="/contacto" className="link-underline">
              Ver datos de contacto →
            </Link>
          </div>
          <AgencyMap height={360} />
        </div>
      </section>

      <SiteFooter />
      <DarkToggle />
    </div>
  );
}
