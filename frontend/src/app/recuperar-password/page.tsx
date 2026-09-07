import type { Metadata } from 'next';
import { RecuperarPasswordView } from './RecuperarPasswordView';

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description: 'Recuperar contraseña — 5848 Motors.',
};

export default function RecuperarPasswordPage() {
  return <RecuperarPasswordView />;
}
