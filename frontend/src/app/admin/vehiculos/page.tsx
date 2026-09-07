import type { Metadata } from 'next';
import { AdminVehiculosView } from './AdminVehiculosView';

export const metadata: Metadata = {
  title: 'Vehículos',
  description: 'Vehículos — Panel admin 5848 Motors.',
};

export default function AdminVehiculosPage() {
  return <AdminVehiculosView />;
}
