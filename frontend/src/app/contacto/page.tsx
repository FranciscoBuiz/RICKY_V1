import type { Metadata } from 'next';
import { ContactoView } from './ContactoView';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contacto — 5848 Motors, Gaboto 5848, Mar del Plata.',
};

export default function ContactoPage() {
  return <ContactoView />;
}
