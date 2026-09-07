import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TurnoView } from './TurnoView';

export const metadata: Metadata = {
  title: 'Reservar turno',
  description: 'Reservar turno de detailing — 5848 Motors.',
};

export default function DetailingTurnoPage() {
  return (
    <Suspense fallback={null}>
      <TurnoView />
    </Suspense>
  );
}
