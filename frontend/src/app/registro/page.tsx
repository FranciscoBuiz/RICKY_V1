import type { Metadata } from 'next';
import { RegistroView } from './RegistroView';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Crear cuenta — 5848 Motors.',
};

export default function RegistroPage() {
  return <RegistroView />;
}
