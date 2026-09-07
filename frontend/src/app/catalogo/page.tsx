import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CatalogoView } from './CatalogoView';

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'Catálogo de vehículos usados y 0km — 5848 Motors, Mar del Plata.',
};

export default function CatalogoPage() {
  // `CatalogoView` lee los filtros de la URL con useSearchParams: pide Suspense.
  return (
    <Suspense fallback={null}>
      <CatalogoView />
    </Suspense>
  );
}
