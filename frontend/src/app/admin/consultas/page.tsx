import type { Metadata } from 'next';
import { AdminConsultasView } from './AdminConsultasView';

export const metadata: Metadata = {
  title: 'Consultas',
  description: 'Consultas — Panel admin 5848 Motors.',
};

export default function AdminConsultasPage() {
  return <AdminConsultasView />;
}
