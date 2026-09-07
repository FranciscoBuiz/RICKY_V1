'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { DarkToggle } from '@/components/site/DarkToggle';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { VehicleCard, VehicleGrid } from '@/components/site/VehicleCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useResource } from '@/lib/api';
import { EYEBROW, PAGE_TITLE, SHELL } from '@/lib/design';
import { money, pluralize } from '@/lib/format';
import { useIsNarrow } from '@/lib/hooks';
import type { PublicVehicle, VehicleSort } from '@/types';

interface CatalogResponse {
  vehicles: PublicVehicle[];
  total: number;
  options: {
    brands: string[];
    bodyTypes: string[];
    fuels: string[];
    transmissions: string[];
  };
}

interface Filters {
  brand: string;
  bodyType: string;
  fuel: string;
  transmission: string;
  /** Precio máximo, en pesos y como string porque viaja por la URL. */
  priceMax: string;
  /** Búsqueda libre por marca, modelo o versión. */
  search: string;
}

const EMPTY_FILTERS: Filters = {
  brand: 'all',
  bodyType: 'all',
  fuel: 'all',
  transmission: 'all',
  priceMax: 'all',
  search: '',
};

/** Topes de precio del filtro rápido, en pesos. */
const PRICE_STEPS = [15_000_000, 20_000_000, 25_000_000, 30_000_000, 40_000_000];

const SORT_OPTIONS: { value: VehicleSort; label: string }[] = [
  { value: 'featured', label: 'Ordenar — Destacados' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'km_asc', label: 'Menor kilometraje' },
];

const SELECT: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  padding: '10px 14px',
  fontSize: 14,
  color: 'var(--ink)',
  minWidth: 150,
  cursor: 'pointer',
};

const SKELETON_SLOTS = [0, 1, 2, 3, 4, 5];

export function CatalogoView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsNarrow(860);

  /**
   * Los filtros viven en la URL, no en estado local. Así el resultado se puede
   * compartir y guardar, sobrevive a una recarga, y —lo que más importa— volver
   * atrás desde una ficha devuelve la búsqueda tal como estaba.
   */
  const filters: Filters = {
    brand: params.get('brand') ?? 'all',
    bodyType: params.get('bodyType') ?? 'all',
    fuel: params.get('fuel') ?? 'all',
    transmission: params.get('transmission') ?? 'all',
    priceMax: params.get('priceMax') ?? 'all',
    search: params.get('search') ?? '',
  };
  const sort = (params.get('sort') as VehicleSort | null) ?? 'featured';

  const commit = useCallback(
    (next: Partial<Filters & { sort: VehicleSort }>) => {
      const query = new URLSearchParams(params.toString());
      Object.entries(next).forEach(([key, value]) => {
        if (!value || value === 'all' || (key === 'sort' && value === 'featured')) query.delete(key);
        else query.set(key, String(value));
      });
      const qs = query.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // La query viaja en la URL, así que cada cambio de filtro dispara una carga
  // real contra la API y los estados de loading/empty salen solos.
  const query = useMemo(() => {
    const search = new URLSearchParams({ sort });
    (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
      const value = filters[key];
      if (value && value !== 'all') search.set(key, value);
    });
    return `/api/vehicles?${search.toString()}`;
  }, [filters, sort]);

  const { data, status, error, reload } = useResource<CatalogResponse>(query);

  const vehicles = data?.vehicles ?? [];
  const options = data?.options;
  const isLoading = status === 'loading';
  const countLabel = pluralize(vehicles.length, 'vehículo', 'vehículos');

  const setFilter = (key: keyof Filters) => (event: React.ChangeEvent<HTMLSelectElement>) =>
    commit({ [key]: event.target.value });

  const clearFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  /** Cuántos filtros hay puestos: en móvil es lo único que los hace visibles. */
  const activeCount = (Object.keys(EMPTY_FILTERS) as (keyof Filters)[]).filter(
    (key) => filters[key] !== EMPTY_FILTERS[key],
  ).length;

  const filterSelects = (style: CSSProperties) => (
    <>
      <select value={filters.brand} onChange={setFilter('brand')} style={style} aria-label="Marca">
        <option value="all">Marca — Todas</option>
        {options?.brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>
      <select value={filters.bodyType} onChange={setFilter('bodyType')} style={style} aria-label="Carrocería">
        <option value="all">Carrocería — Todas</option>
        {options?.bodyTypes.map((bodyType) => (
          <option key={bodyType} value={bodyType}>
            {bodyType}
          </option>
        ))}
      </select>
      <select value={filters.fuel} onChange={setFilter('fuel')} style={style} aria-label="Combustible">
        <option value="all">Combustible — Todos</option>
        {options?.fuels.map((fuel) => (
          <option key={fuel} value={fuel}>
            {fuel}
          </option>
        ))}
      </select>
      <select
        value={filters.priceMax}
        onChange={setFilter('priceMax')}
        style={style}
        aria-label="Precio máximo"
      >
        <option value="all">Precio — Sin tope</option>
        {PRICE_STEPS.map((step) => (
          <option key={step} value={String(step)}>
            Hasta {money(step)}
          </option>
        ))}
      </select>
      <select
        value={filters.transmission}
        onChange={setFilter('transmission')}
        style={style}
        aria-label="Transmisión"
      >
        <option value="all">Transmisión — Todas</option>
        {options?.transmissions.map((transmission) => (
          <option key={transmission} value={transmission}>
            {transmission}
          </option>
        ))}
      </select>
    </>
  );

  const sortSelect = (style: CSSProperties) => (
    <select
      value={sort}
      onChange={(event) => commit({ sort: event.target.value as VehicleSort })}
      style={style}
      aria-label="Ordenar"
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <div style={{ minHeight: '100vh' }}>
      <SiteHeader active="/catalogo" />

      <section
        style={{
          ...SHELL,
          padding: '56px var(--gutter) 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={EYEBROW}>Catálogo</div>
          <h1 style={{ ...PAGE_TITLE, margin: '0 0 10px' }}>
            Nuestro stock
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0, maxWidth: 480 }}>
            Vehículos verificados, listos para conocer en el local de Gaboto 5848.
          </p>
        </div>
      </section>

      {/* FILTROS */}
      <section
        style={{
          ...SHELL,
          padding: '0 var(--gutter) 24px',
          position: isMobile ? 'static' : 'sticky',
          top: 76,
          zIndex: 20,
          background: 'var(--bg)',
        }}
      >
        {!isMobile ? (
          <div
            style={{
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              padding: '18px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              alignItems: 'center',
            }}
          >
            {filterSelects(SELECT)}
            <button
              type="button"
              onClick={clearFilters}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Limpiar filtros
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                {countLabel}
              </span>
              {sortSelect(SELECT)}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              style={{
                flex: 1,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                padding: 14,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              Filtros y orden
              {activeCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: 'var(--accent)',
                    color: '#F5F2EE',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    padding: '2px 7px',
                    borderRadius: 2,
                  }}
                >
                  {activeCount}
                </span>
              )}
            </button>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {countLabel}
            </span>
          </div>
        )}
      </section>

      {/* HOJA DE FILTROS EN MOBILE */}
      {sheetOpen && (
        <div
          role="presentation"
          onClick={() => setSheetOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16,15,13,0.5)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            role="dialog"
            aria-label="Filtros y orden"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: 'var(--bg)',
              width: '100%',
              maxHeight: '82vh',
              overflowY: 'auto',
              padding: '24px 24px 32px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                margin: '0 auto 24px',
              }}
            />
            <div
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 20 }}
            >
              Filtros y orden
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filterSelects({ ...SELECT, width: '100%' })}
              {sortSelect({ ...SELECT, width: '100%' })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  flex: 1,
                  border: '1px solid var(--border)',
                  background: 'none',
                  padding: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'var(--invert-bg)',
                  color: 'var(--invert-ink)',
                  padding: 14,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTADOS */}
      <section style={{ ...SHELL, padding: '8px var(--gutter) 96px', minHeight: 400 }}>
        {isLoading && (
          <VehicleGrid>
            {SKELETON_SLOTS.map((slot) => (
              <div key={slot} style={{ background: 'var(--bg)', padding: 4 }}>
                <div className="skeleton" style={{ aspectRatio: '4 / 3' }} />
                <div style={{ padding: '22px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="70%" height={18} />
                  <Skeleton width="50%" height={14} />
                </div>
              </div>
            ))}
          </VehicleGrid>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '96px 24px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Error
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 24,
                marginBottom: 12,
              }}
            >
              No pudimos cargar el stock.
            </div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>{error}</p>
            <button
              type="button"
              onClick={reload}
              style={{
                background: 'var(--invert-bg)',
                color: 'var(--invert-ink)',
                border: 'none',
                padding: '14px 28px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {status === 'ready' && vehicles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '96px 24px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Sin resultados
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 24,
                marginBottom: 24,
              }}
            >
              No encontramos vehículos con esos filtros.
            </div>
            <button
              type="button"
              onClick={clearFilters}
              style={{
                background: 'var(--invert-bg)',
                color: 'var(--invert-ink)',
                border: 'none',
                padding: '14px 28px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {status === 'ready' && vehicles.length > 0 && (
          <VehicleGrid>
            {vehicles.map((vehicle, index) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} index={index} showFuel />
            ))}
          </VehicleGrid>
        )}
      </section>

      <SiteFooter />
      <DarkToggle />
    </div>
  );
}
