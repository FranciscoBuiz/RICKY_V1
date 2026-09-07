import type { Metadata } from 'next';
import { LoginView } from './LoginView';

export const metadata: Metadata = {
  title: 'Ingresar',
  description: 'Ingresar — 5848 Motors.',
};

export default function LoginPage() {
  return <LoginView />;
}
