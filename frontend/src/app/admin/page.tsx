import type { Metadata } from 'next';
import { AdminDashboardView } from './AdminDashboardView';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Panel administrativo — 5848 Motors.',
};

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
