import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Dashboard v1',
  description: 'Resumen general (versión 1) — Panel admin 5848 Motors.',
};

/**
 * Primera versión del dashboard, conservada del prototipo: un resumen de
 * métricas antes de que el panel pasara a un modelo de "action center".
 * La versión vigente es /admin.
 */

const STOCK_STATS = [
  { label: 'Publicados', value: '11' },
  { label: 'Reservados', value: '2' },
  { label: 'Vendidos (mes)', value: '3' },
  { label: 'Consultas nuevas', value: '7' },
];

const FINANCE_STATS = [
  { label: 'Capital invertido', value: '$ 284.500.000', tone: undefined },
  { label: 'Gastos acumulados', value: '$ 12.300.000', tone: undefined },
  { label: 'Margen potencial', value: '$ 38.900.000', tone: '#2F7A4D' },
  { label: 'Margen realizado (mes)', value: '$ 6.100.000', tone: '#2F7A4D' },
];

const MARGINS = [820000, 1200000, 640000, 1500000, 980000, 450000];

const LEADS_PREVIEW = [
  { name: 'Martina G.', vehicle: 'Corolla XEi' },
  { name: 'Lucas P.', vehicle: 'T-Cross' },
  { name: 'Sol R.', vehicle: 'Ranger XLT' },
];

const TURNOS_PREVIEW = [
  { client: 'Fernando A.', when: 'Hoy 15:00' },
  { client: 'Carla M.', when: 'Mañana 10:00' },
];

const CARD: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)' };

const ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid var(--border2)',
  fontSize: 13,
  gap: 12,
};

export default function AdminDashboardV1Page() {
  const maxMargin = Math.max(...MARGINS);

  return (
    <AdminShell
      active="Dashboard"
      title={<div style={{ fontSize: 14, fontWeight: 600 }}>Dashboard v1</div>}
      actions={
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>admin@5848motors.com.ar</div>
      }
    >
      <div style={{ padding: '28px 24px 64px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: 0 }}>
            Resumen general
          </h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
            Actualizado hoy
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 1,
            background: 'var(--border)',
            border: '1px solid var(--border)',
            marginBottom: 28,
          }}
        >
          {STOCK_STATS.map((stat) => (
            <div key={stat.label} style={{ background: 'var(--card)', padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{stat.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 600 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 1,
            background: 'var(--border)',
            border: '1px solid var(--border)',
            marginBottom: 28,
          }}
        >
          {FINANCE_STATS.map((stat) => (
            <div key={stat.label} style={{ background: 'var(--card)', padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{stat.label}</div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 600,
                  color: stat.tone ?? 'var(--ink)',
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 1.4fr) minmax(240px, 1fr)',
            gap: 20,
          }}
        >
          <div style={{ ...CARD, padding: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
              Margen potencial por vehículo
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
              {MARGINS.map((margin, index) => (
                <div
                  key={margin}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      width: '70%',
                      height: `${(margin / maxMargin) * 100}%`,
                      background: 'var(--invert-bg)',
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>#{index + 1}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...CARD, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Consultas nuevas</div>
              {LEADS_PREVIEW.map((lead) => (
                <div key={lead.name} style={ROW}>
                  <span>{lead.name}</span>
                  <span style={{ color: 'var(--muted)' }}>{lead.vehicle}</span>
                </div>
              ))}
              <Link
                href="/admin/consultas"
                style={{ display: 'block', fontSize: 12, fontWeight: 600, marginTop: 12 }}
              >
                Ver todas →
              </Link>
            </div>

            <div style={{ ...CARD, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Turnos próximos</div>
              {TURNOS_PREVIEW.map((turno) => (
                <div key={turno.client} style={ROW}>
                  <span>{turno.client}</span>
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{turno.when}</span>
                </div>
              ))}
              <Link
                href="/admin/detailing"
                style={{ display: 'block', fontSize: 12, fontWeight: 600, marginTop: 12 }}
              >
                Ver agenda →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
