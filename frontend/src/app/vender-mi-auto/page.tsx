import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VenderMiAutoView } from './VenderMiAutoView';

export const metadata: Metadata = {
  title: 'Vendé tu auto',
  description: 'Vendé tu auto — 5848 Motors, Mar del Plata.',
};

export default function VenderMiAutoPage() {
  // `VenderMiAutoView` lee `?paso=` con useSearchParams, que exige Suspense.
  return (
    <Suspense fallback={null}>
      <VenderMiAutoView />
    </Suspense>
  );
}
