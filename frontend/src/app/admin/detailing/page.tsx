import type { Metadata } from 'next';
import { AdminDetailingView } from './AdminDetailingView';

export const metadata: Metadata = {
  title: 'Detailing',
  description: 'Detailing — Panel admin 5848 Motors.',
};

export default function AdminDetailingPage() {
  return <AdminDetailingView />;
}
