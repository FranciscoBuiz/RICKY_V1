import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { AdminVehiculosView } from './AdminVehiculosView';

export const metadata: Metadata = {
  title: 'Vehículos',
  description: 'Vehículos — Panel admin 5848 Motors.',
};

export default async function AdminVehiculosPage() {
  /* El rol decide qué controles se dibujan. La autorización de verdad la
     hacen las rutas: esto sólo evita ofrecer botones que darían 403. */
  const sesion = await getSessionFromCookies();
  if (!sesion) redirect('/login');

  return <AdminVehiculosView usuario={sesion} />;
}
