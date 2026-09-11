import { describe, expect, it } from 'vitest';
import { canalDeRespuesta, waHrefCliente } from '@/app/admin/consultas/responder';
import type { Lead, LeadSource } from '@/types';

function lead(parcial: Partial<Lead> = {}): Lead {
  return {
    id: 'l1',
    name: 'Martina',
    contact: '223 555-0111',
    phone: '223 555-0111',
    email: 'martina@example.com',
    vehicle: 'Toyota Etios XLS',
    origin: 'Web' as LeadSource,
    date: '2026-09-10',
    createdAt: '2026-09-10T13:00:00.000Z',
    message: '¿Sigue disponible?',
    status: 'new',
    ...parcial,
  };
}

describe('waHrefCliente', () => {
  /*
   * `fields.ts` fija PHONE_DIGITS = 10: el formulario pide el teléfono argentino
   * sin 0 ni 15. wa.me quiere el internacional, que para un celular argentino es
   * 54 + 9 + esos diez dígitos.
   */
  it('arma el internacional a partir de los diez dígitos que pide el formulario', () => {
    expect(waHrefCliente('223 555-0111', 'Hola')).toBe('https://wa.me/5492235550111?text=Hola');
  });

  it('ignora el formato: espacios, guiones y paréntesis no cambian el número', () => {
    const esperado = waHrefCliente('2235550111', 'Hola');
    expect(waHrefCliente('(223) 555-0111', 'Hola')).toBe(esperado);
    expect(waHrefCliente('223-555-0111', 'Hola')).toBe(esperado);
  });

  it('no duplica el país cuando el teléfono ya viene internacional', () => {
    expect(waHrefCliente('+54 9 223 555-0111', 'Hola')).toBe(
      'https://wa.me/5492235550111?text=Hola',
    );
    expect(waHrefCliente('54 223 555-0111', 'Hola')).toBe('https://wa.me/5492235550111?text=Hola');
  });

  /*
   * Devolver null y no un enlace a medias: un wa.me con un número corto abre una
   * página de error de WhatsApp, y el empleado cree que el problema es del
   * cliente. Mismo criterio que `whatsappHref` cuando no hay número configurado.
   */
  it('sin diez dígitos no hay enlace', () => {
    expect(waHrefCliente('555-0111', 'Hola')).toBeNull();
    expect(waHrefCliente('', 'Hola')).toBeNull();
    expect(waHrefCliente('no es un teléfono', 'Hola')).toBeNull();
  });

  it('escapa el mensaje, que es texto libre escrito por el admin', () => {
    const href = waHrefCliente('2235550111', 'Hola & chau: ¿va?');
    expect(href).toContain('?text=Hola%20%26%20chau%3A%20%C2%BFva%3F');
  });
});

describe('canalDeRespuesta', () => {
  it('una consulta que entró por WhatsApp se responde por WhatsApp', () => {
    const canal = canalDeRespuesta(lead({ origin: 'WhatsApp' }), 'Hola');
    expect(canal.canal).toBe('whatsapp');
    expect(canal.href).toBe('https://wa.me/5492235550111?text=Hola');
    expect(canal.etiqueta).toBe('Responder por WhatsApp');
  });

  it('una consulta web se responde por email', () => {
    const canal = canalDeRespuesta(lead({ origin: 'Web' }), 'Hola');
    expect(canal.canal).toBe('email');
    expect(canal.href).toContain('mailto:martina@example.com');
    expect(canal.etiqueta).toBe('Responder por email');
  });

  /*
   * El alta de lead exige teléfono O email, así que hay consultas web sin
   * correo. Antes que no ofrecer nada, se cae al otro canal disponible.
   */
  it('una consulta web sin email cae a WhatsApp', () => {
    const canal = canalDeRespuesta(lead({ origin: 'Web', email: '' }), 'Hola');
    expect(canal.canal).toBe('whatsapp');
  });

  it('una consulta de WhatsApp con un teléfono inservible cae al email', () => {
    const canal = canalDeRespuesta(lead({ origin: 'WhatsApp', phone: '555' }), 'Hola');
    expect(canal.canal).toBe('email');
  });

  it('sin teléfono usable ni email no inventa un canal', () => {
    const canal = canalDeRespuesta(lead({ phone: '555', email: '' }), 'Hola');
    expect(canal.canal).toBe('ninguno');
    expect(canal.href).toBeNull();
    expect(canal.motivo).toBeTruthy();
  });

  it('Instagram y Vendé tu auto se tratan como web: primero el email', () => {
    expect(canalDeRespuesta(lead({ origin: 'Instagram' }), 'Hola').canal).toBe('email');
    expect(canalDeRespuesta(lead({ origin: 'Vendé tu auto' }), 'Hola').canal).toBe('email');
  });

  it('el asunto del mail nombra el vehículo, para que el cliente ubique la consulta', () => {
    const canal = canalDeRespuesta(lead({ origin: 'Web' }), 'Hola');
    expect(canal.href).toContain(encodeURIComponent('Toyota Etios XLS'));
  });
});
