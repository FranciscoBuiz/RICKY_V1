import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { AdminDashboardView } from './AdminDashboardView';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Panel administrativo — 5848 Motors.',
};

export default async function AdminDashboardPage() {
  /* El topbar dice quien esta conectado, asi que esta pagina tambien necesita
     la sesion. Era la ultima del panel que se servia estatica. */
  const sesion = await getSessionFromCookies();
  if (!sesion) redirect('/login');

  return <AdminDashboardView usuario={sesion} />;
}
