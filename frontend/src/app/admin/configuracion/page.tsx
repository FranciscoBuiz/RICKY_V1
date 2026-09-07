import type { Metadata } from 'next';
import { AdminConfiguracionView } from './AdminConfiguracionView';

export const metadata: Metadata = {
  title: 'Configuración',
  description: 'Configuración — Panel admin 5848 Motors.',
};

export default function AdminConfiguracionPage() {
  return <AdminConfiguracionView />;
}
