import Link from 'next/link';
import { kilometers, money } from '@/lib/format';
import {
  META_LINE,
  PLACEHOLDER_LABEL,
  photoPlaceholder,
  statusBadge,
  vehicleStatusMeta,
} from '@/lib/design';
import { Photo } from '@/components/ui/Photo';
import type { PublicVehicle } from '@/types';

interface VehicleCardProps {
  vehicle: PublicVehicle;
  index: number;
  /** El catálogo agrega el combustible a la línea de metadatos. */
  showFuel?: boolean;
}

export function VehicleCard({ vehicle, index, showFuel = false }: VehicleCardProps) {
  const meta = vehicleStatusMeta[vehicle.status];
  const [principal, secundaria] = vehicle.images;

  return (
    <Link
      href={`/vehiculos/${vehicle.id}`}
      className="vehicle-card ui-lift"
      style={{ background: 'var(--bg)', display: 'block', textDecoration: 'none', color: 'var(--ink)' }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden' }}>
        <Photo
          src={principal?.src}
          alt={principal?.alt ?? `${vehicle.brand} ${vehicle.model}`}
          loading={index < 3 ? 'eager' : 'lazy'}
          style={{ position: 'absolute', inset: 0 }}
          fallback={
            /* Sin fotos: el marcador de bandas. Es lo que ve todo vehículo que
               el panel dé de alta, porque todavía no se pueden subir fotos. */
            <div style={photoPlaceholder(index)}>
              <span style={PLACEHOLDER_LABEL}>
                [ foto — {vehicle.brand} {vehicle.model} ]
              </span>
            </div>
          }
        />
        {/* La alterna del hover sólo existe si hay una segunda foto, o si no hay
            ninguna: un vehículo con una sola foto no debe revelar un marcador al
            pasar el mouse. */}
        {secundaria || vehicle.images.length === 0 ? (
          <Photo
            className="vehicle-photo-alt"
            src={secundaria?.src}
            alt=""
            decorative
            style={{ position: 'absolute', inset: 0 }}
            fallback={
              <div style={photoPlaceholder(index, true)}>
                <span style={PLACEHOLDER_LABEL}>[ foto 2 ]</span>
              </div>
            }
          />
        ) : null}
        <div style={statusBadge(vehicle.status)}>{meta.label}</div>
      </div>

      <div style={{ padding: '22px 4px' }}>
        <div style={{ ...META_LINE, marginBottom: 8 }}>
          {vehicle.year} · {kilometers(vehicle.mileage)}
          {showFuel ? ` · ${vehicle.fuel}` : ''}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, marginBottom: 4 }}>
          {vehicle.brand} {vehicle.model}
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 18 }}>{vehicle.version}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontWeight: 600, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
            {money(vehicle.price)}
          </div>
          <span className="vehicle-cta" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
            Ver vehículo →
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Grilla de 2px de separación sobre el color de borde, igual que el diseño. */
export function VehicleGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 2,
        background: 'var(--border)',
      }}
    >
      {children}
    </div>
  );
}
