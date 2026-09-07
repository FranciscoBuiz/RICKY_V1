import Link from 'next/link';
import { AGENCY_ADDRESS, MAP_LINK } from '@/components/site/AgencyMap';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, WHATSAPP_NUMBER, whatsappHref } from '@/lib/design';
import { displayPhone } from '@/lib/fields';

const COLUMN_LABEL: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(245,242,238,0.4)',
  marginBottom: 18,
};

const FOOTER_LINK: React.CSSProperties = { color: 'rgba(245,242,238,0.75)', fontSize: 14 };

/** Pie completo del sitio público. Mantiene su paleta oscura en ambos temas. */
export function SiteFooter() {
  return (
    <footer
      style={{
        background: '#100F0D',
        color: '#F5F2EE',
        padding: 'clamp(52px, 8vw, 80px) var(--gutter) 32px',
      }}
    >
      <div style={{ maxWidth: 'var(--shell)', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'clamp(28px, 4vw, 40px)',
            paddingBottom: 'clamp(36px, 5vw, 56px)',
            borderBottom: '1px solid rgba(245,242,238,0.12)',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, marginBottom: 14 }}>
              5848<span style={{ color: 'var(--accent)' }}> MOTORS</span>
            </div>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noreferrer"
              className="ui-link"
              style={{
                fontSize: 14,
                color: 'rgba(245,242,238,0.6)',
                lineHeight: 1.6,
                display: 'block',
                maxWidth: 220,
              }}
            >
              {AGENCY_ADDRESS}
            </a>
          </div>

          <div>
            <div style={COLUMN_LABEL}>Navegación</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/catalogo" className="ui-link" style={FOOTER_LINK}>
                Vehículos
              </Link>
              <Link href="/nosotros" className="ui-link" style={FOOTER_LINK}>
                Nosotros
              </Link>
              <Link href="/contacto" className="ui-link" style={FOOTER_LINK}>
                Contacto
              </Link>
            </div>
          </div>

          <div>
            <div style={COLUMN_LABEL}>Servicios</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/vender-mi-auto" className="ui-link" style={FOOTER_LINK}>
                Vendé tu auto
              </Link>
              <Link href="/detailing" className="ui-link" style={FOOTER_LINK}>
                Detailing
              </Link>
            </div>
          </div>

          <div>
            <div style={COLUMN_LABEL}>Contacto</div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                fontSize: 14,
                color: 'rgba(245,242,238,0.75)',
              }}
            >
              {whatsappHref() && (
                <a href={whatsappHref() ?? undefined} className="ui-link" style={FOOTER_LINK}>
                  WhatsApp — {displayPhone(WHATSAPP_NUMBER)}
                </a>
              )}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="ui-link"
                style={FOOTER_LINK}
              >
                Instagram — {INSTAGRAM_HANDLE}
              </a>
              <a href={MAP_LINK} target="_blank" rel="noreferrer" className="ui-link" style={FOOTER_LINK}>
                {AGENCY_ADDRESS}
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            paddingTop: 24,
            fontSize: 12,
            color: 'rgba(245,242,238,0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span>© 2026 5848 Motors</span>
          <span>Mar del Plata, Argentina</span>
        </div>
      </div>
    </footer>
  );
}
