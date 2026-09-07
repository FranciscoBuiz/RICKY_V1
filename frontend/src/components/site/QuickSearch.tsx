'use client';

import { useRouter } from 'next/navigation';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { money } from '@/lib/format';

/**
 * Buscador rápido del hero.
 *
 * Antes eran cuatro `<div>` decorativos que anunciaban Marca / Año / Precio /
 * Km y no hacían nada; el botón iba a un catálogo sin filtrar. Ahora son
 * controles reales y sólo se ofrecen las facetas que el catálogo sabe filtrar:
 * marca, precio máximo y texto libre.
 */

/** Topes de precio, alineados con los del catálogo. */
const PRICE_STEPS = [15_000_000, 20_000_000, 25_000_000, 30_000_000, 40_000_000];

const CONTROL: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  padding: '11px 14px',
  fontSize: 14,
  color: 'var(--ink)',
  minWidth: 130,
  flex: '1 1 130px',
  cursor: 'pointer',
};

export function QuickSearch({ brands }: { brands: string[] }) {
  const router = useRouter();
  const [brand, setBrand] = useState('all');
  const [priceMax, setPriceMax] = useState('all');
  const [search, setSearch] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (brand !== 'all') query.set('brand', brand);
    if (priceMax !== 'all') query.set('priceMax', priceMax);
    if (search.trim()) query.set('search', search.trim());

    const qs = query.toString();
    router.push(qs ? `/catalogo?${qs}` : '/catalogo');
  }

  return (
    <form
      onSubmit={submit}
      style={{
        ...SHELL_BAR,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.1em',
          color: 'var(--muted)',
          textTransform: 'uppercase',
        }}
      >
        Buscar
      </span>

      <label style={{ display: 'contents' }}>
        <span style={SR_ONLY}>Marca</span>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} style={CONTROL}>
          <option value="all">Marca — Todas</option>
          {brands.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'contents' }}>
        <span style={SR_ONLY}>Precio máximo</span>
        <select value={priceMax} onChange={(e) => setPriceMax(e.target.value)} style={CONTROL}>
          <option value="all">Precio — Sin tope</option>
          {PRICE_STEPS.map((step) => (
            <option key={step} value={String(step)}>
              Hasta {money(step)}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'contents' }}>
        <span style={SR_ONLY}>Buscar por modelo</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Modelo o versión"
          style={{ ...CONTROL, cursor: 'text', flex: '1 1 160px' }}
        />
      </label>

      <button
        type="submit"
        className="ui-btn"
        style={{
          marginLeft: 'auto',
          background: 'var(--accent)',
          color: '#F5F2EE',
          border: 'none',
          padding: '12px 26px',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 2,
          cursor: 'pointer',
          flex: '1 1 auto',
        }}
      >
        Buscar vehículos
      </button>
    </form>
  );
}

const SHELL_BAR: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 10,
  background: 'var(--card)',
  border: '1px solid var(--border)',
  padding: 14,
};

/** Etiqueta sólo para lectores de pantalla: el placeholder no alcanza. */
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
