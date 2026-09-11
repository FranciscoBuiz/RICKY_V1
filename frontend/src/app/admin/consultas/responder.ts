import type { Lead } from '@/types';

/*
 * A dónde va la respuesta que el admin escribe en el panel.
 *
 * Vive al lado de su vista y no adentro, por lo mismo que `margen.ts`: el runner
 * corre con `environment: 'node'` e `include` de `.ts`, y no puede importar el
 * `.tsx` de la vista.
 *
 * Nada de esto envía: arma el enlace que abre el canal real con el texto ya
 * cargado. El mensaje lo manda una persona. Que el sistema envíe solo es otro
 * trabajo, y depende de tener dominio propio (email) o de la Cloud API de
 * WhatsApp Business con todo lo que arrastra.
 */

/** `fields.ts` pide el teléfono argentino sin 0 ni 15: diez dígitos. */
const DIGITOS_LOCALES = 10;

/**
 * Los diez dígitos locales, venga el teléfono como venga.
 *
 * Se decide por largo y no por prefijo porque ningún código de área argentino
 * empieza con 5: un `54` adelante de un número de doce dígitos es el país, no
 * parte del número.
 */
function diezDigitos(phone: string): string | null {
  const d = phone.replace(/\D/g, '');
  if (d.length === DIGITOS_LOCALES) return d;
  if (d.length === 11 && d.startsWith('9')) return d.slice(1);
  if (d.length === 12 && d.startsWith('54')) return d.slice(2);
  if (d.length === 13 && d.startsWith('549')) return d.slice(3);
  return null;
}

/**
 * Enlace de WhatsApp **al cliente**.
 *
 * Ojo con `whatsappHref` de `lib/design.ts`: ese apunta al número de la agencia
 * porque es para el sitio público, donde la dirección es visitante → agencia. En
 * el panel la dirección es la inversa y usarlo ahí abre un chat de la agencia
 * consigo misma.
 *
 * `null` cuando el teléfono no sirve: un wa.me con un número corto abre un error
 * de WhatsApp que se confunde con un problema del cliente.
 */
export function waHrefCliente(phone: string, mensaje: string): string | null {
  const local = diezDigitos(phone);
  if (!local) return null;
  return `https://wa.me/549${local}?text=${encodeURIComponent(mensaje)}`;
}

/** Enlace de correo al cliente, con el vehículo en el asunto. */
export function mailtoHrefCliente(lead: Lead, mensaje: string): string | null {
  const email = lead.email.trim();
  if (!email) return null;
  const asunto = lead.vehicle
    ? `Tu consulta por ${lead.vehicle} — 5848 Motors`
    : 'Tu consulta — 5848 Motors';
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
}

export type Canal = 'whatsapp' | 'email' | 'ninguno';

export interface CanalDeRespuesta {
  canal: Canal;
  /** `null` sólo cuando no hay canal. */
  href: string | null;
  /** Lo que dice el botón: el empleado sabe a dónde va antes de apretarlo. */
  etiqueta: string;
  /** Por qué no se puede responder, cuando no se puede. */
  motivo?: string;
}

/**
 * El panel elige el canal por el origen de la consulta, y cae al otro cuando el
 * primero no está disponible: el alta de lead exige teléfono **o** email, así
 * que hay consultas web sin correo y consultas con un teléfono impresentable.
 */
export function canalDeRespuesta(lead: Lead, mensaje: string): CanalDeRespuesta {
  const wa = waHrefCliente(lead.phone, mensaje);
  const mail = mailtoHrefCliente(lead, mensaje);

  const porWhatsapp: CanalDeRespuesta = {
    canal: 'whatsapp',
    href: wa,
    etiqueta: 'Responder por WhatsApp',
  };
  const porEmail: CanalDeRespuesta = {
    canal: 'email',
    href: mail,
    etiqueta: 'Responder por email',
  };

  const porOrigen =
    lead.origin === 'WhatsApp'
      ? [wa && porWhatsapp, mail && porEmail]
      : [mail && porEmail, wa && porWhatsapp];

  const elegido = porOrigen.find(Boolean);
  if (elegido) return elegido;

  return {
    canal: 'ninguno',
    href: null,
    etiqueta: 'Sin canal para responder',
    motivo: 'Esta consulta no dejó un teléfono usable ni un email.',
  };
}
