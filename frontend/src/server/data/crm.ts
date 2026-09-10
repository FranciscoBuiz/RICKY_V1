import { isoDate } from '@/lib/format';
import type {
  ActionAlert,
  ActivityEntry,
  AdminNotification,
  AgencySettings,
  Appointment,
  BusinessMetric,
  DetailingService,
  Lead,
  NotificationPrefs,
  VehicleAlert,
} from '@/types';

/**
 * Días desde hoy, no una fecha fija. Antes esto era `AGENDA_WEEK = '2026-09'`,
 * con lo cual la agenda entera envejecía: un turno "confirmado" pasaba a estar
 * en el pasado con solo dejar correr el calendario. La demo queda levantada en
 * el home lab, así que tiene que seguir teniendo sentido en un mes.
 *
 * Uso `isoDate` (hora local) en vez de `date.toISOString().slice(0, 10)` (UTC)
 * a propósito: Argentina es UTC-3, así que entre las 21:00 y la medianoche
 * hora local, `toISOString()` ya cayó en el día siguiente en UTC. Con eso,
 * `day(0)` dejaría de ser "hoy" tres horas por día, todos los días — y ese es
 * justo el offset que usa el turno `in_progress` para verse hoy en el panel.
 * `isoDate` ya es el formateador que usa el resto del proyecto para esto
 * mismo (`lib/format.ts`, `server/store.ts`), así que no es una convención
 * nueva.
 */
const day = (offset: number): string => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + offset);
  return isoDate(fecha);
};

export const seedLeads: Lead[] = [
  {
    id: 'l1',
    name: 'Martina G.',
    contact: '223 555-0111 · martina@example.com',
    phone: '223 555-0111',
    email: 'martina@example.com',
    vehicle: 'Toyota Etios XLS',
    origin: 'Web',
    date: '02/09',
    createdAt: '2026-09-02T10:12:00',
    message: 'Quiero consultar por el Etios, ¿tiene service oficial?',
    status: 'new',
  },
  {
    id: 'l2',
    name: 'Lucas P.',
    contact: '223 555-0112',
    phone: '223 555-0112',
    email: 'lucas@example.com',
    vehicle: 'Volkswagen Fox Comfort',
    origin: 'WhatsApp',
    date: '02/09',
    createdAt: '2026-09-02T09:40:00',
    message: '¿Acepta permuta por un Fiesta 2018?',
    status: 'contacted',
  },
  {
    id: 'l3',
    name: 'Sol R.',
    contact: '223 555-0113 · sol@example.com',
    phone: '223 555-0113',
    email: 'sol@example.com',
    vehicle: 'Toyota Hilux SW4 SRX',
    origin: 'Web',
    date: '01/09',
    createdAt: '2026-09-01T17:05:00',
    message: 'Interesado, ¿puedo verla este finde?',
    status: 'negotiating',
  },
  {
    id: 'l4',
    name: 'Bruno F.',
    contact: '223 555-0114',
    phone: '223 555-0114',
    email: 'bruno@example.com',
    vehicle: 'Fiat Palio Essence',
    origin: 'Instagram',
    date: '31/08',
    createdAt: '2026-08-31T12:30:00',
    message: 'Consulto precio final.',
    status: 'closed',
  },
  {
    id: 'l5',
    name: 'Camila N.',
    contact: '223 555-0115',
    phone: '223 555-0115',
    email: 'camila@example.com',
    vehicle: 'Honda PCX Deluxe',
    origin: 'Web',
    date: '30/08',
    createdAt: '2026-08-30T18:20:00',
    message: 'Ya compré en otro lado, gracias.',
    status: 'discarded',
  },
  {
    id: 'l6',
    name: 'Diego H.',
    contact: '223 555-0116',
    phone: '223 555-0116',
    email: 'diego@example.com',
    vehicle: 'Toyota Etios XLS 2016',
    origin: 'WhatsApp',
    date: '29/08',
    createdAt: '2026-08-29T11:00:00',
    message: '¿Tiene los service al día?',
    status: 'contacted',
  },
  {
    id: 'l7',
    name: 'Valentina O.',
    contact: '223 555-0117',
    phone: '223 555-0117',
    email: 'valentina@example.com',
    vehicle: 'Toyota Hilux SW4 SRX',
    origin: 'Web',
    date: '28/08',
    createdAt: '2026-08-28T15:45:00',
    message: 'Quiero coordinar una prueba de manejo.',
    status: 'new',
  },
];

/** Leads del Action Center del dashboard (más recientes, con antigüedad en minutos). */
export const seedDashboardLeads = [
  {
    id: 'dl1',
    customerName: 'Lucas Fernández',
    source: 'Web',
    vehicle: 'Toyota Etios XLS',
    message: 'Hola, quería saber si todavía está disponible…',
    minsAgo: 18,
    status: 'new',
  },
  {
    id: 'dl2',
    customerName: 'Martina G.',
    source: 'WhatsApp',
    vehicle: 'Volkswagen Fox Comfort',
    message: '¿Acepta permuta por un Fiesta 2018?',
    minsAgo: 47,
    status: 'new',
  },
  {
    id: 'dl3',
    customerName: 'Bruno F.',
    source: 'Instagram',
    vehicle: 'Fiat Palio Essence',
    message: 'Consulto precio final del vehículo.',
    minsAgo: 130,
    status: 'new',
  },
  {
    id: 'dl4',
    customerName: 'Sol R.',
    source: 'Web',
    vehicle: 'Toyota Hilux SW4 SRX',
    message: 'Interesado, ¿puedo verla este finde?',
    minsAgo: 260,
    status: 'contacted',
  },
  {
    id: 'dl5',
    customerName: 'Diego H.',
    source: 'Vendé tu auto',
    vehicle: '—',
    message: 'Quiero vender mi Fiesta 2019.',
    minsAgo: 400,
    status: 'new',
  },
] as const;

/** Turnos de la agenda de detailing (vista lista/calendario del panel). */
export const seedAppointments: Appointment[] = [
  {
    id: 't1',
    client: 'Fernando A.',
    vehicle: 'Toyota Etios XLS',
    service: 'Detailing exterior',
    date: day(1),
    time: '15:00',
    phone: '223 555-0101',
    email: 'fernando@example.com',
    plate: 'AB 123 CD',
    status: 'pending',
  },
  {
    id: 't2',
    client: 'Carla M.',
    vehicle: 'Volkswagen Fox Comfort',
    service: 'Lavado premium',
    date: day(3),
    time: '10:00',
    phone: '223 555-0102',
    email: 'carla@example.com',
    plate: 'AC 456 DE',
    status: 'confirmed',
  },
  {
    id: 't3',
    client: 'Nicolás T.',
    vehicle: 'Toyota Hilux SW4 SRX',
    service: 'Pulido',
    date: day(0),
    time: '13:30',
    phone: '223 555-0103',
    email: 'nicolas@example.com',
    plate: 'AD 789 EF',
    status: 'in_progress',
  },
  {
    id: 't4',
    client: 'Julieta S.',
    vehicle: 'Fiat Palio Essence',
    service: 'Protección',
    date: day(-2),
    time: '09:00',
    phone: '223 555-0104',
    email: 'julieta@example.com',
    plate: 'AE 012 FG',
    status: 'completed',
  },
  {
    id: 't5',
    client: 'Marcos D.',
    vehicle: 'Honda PCX Deluxe',
    service: 'Detailing interior',
    date: day(-9),
    time: '11:00',
    phone: '223 555-0105',
    email: 'marcos@example.com',
    plate: 'AF 345 GH',
    status: 'cancelled',
  },
  {
    id: 't6',
    client: 'Agustina R.',
    vehicle: 'Toyota Etios XLS 2016',
    service: 'Lavado premium',
    date: day(6),
    time: '16:00',
    phone: '223 555-0106',
    email: 'agustina@example.com',
    plate: 'AG 678 HI',
    status: 'pending',
  },
];

/** Turnos del día que muestra el dashboard. */
export const seedTodayAppointments = [
  {
    id: 'ap1',
    time: '09:00',
    customerName: 'Juan Pérez',
    vehicle: 'Toyota Etios XLS',
    service: 'Detailing exterior',
    status: 'confirmed',
  },
  {
    id: 'ap2',
    time: '10:30',
    customerName: 'María Gómez',
    vehicle: 'Volkswagen Fox Comfort',
    service: 'Detailing interior',
    status: 'pending',
  },
  {
    id: 'ap3',
    time: '11:30',
    customerName: 'Carlos Rodríguez',
    vehicle: 'Toyota Hilux SW4 SRX',
    service: 'Lavado premium',
    status: 'confirmed',
  },
  {
    id: 'ap4',
    time: '13:00',
    customerName: 'Lucía Fernández',
    vehicle: 'Fiat Palio Essence',
    service: 'Pulido',
    status: 'in_progress',
  },
  {
    id: 'ap5',
    time: '15:00',
    customerName: 'Agustín Bravo',
    vehicle: 'Honda PCX Deluxe',
    service: 'Protección',
    status: 'completed',
  },
  {
    id: 'ap6',
    time: '16:30',
    customerName: 'Sofía Martín',
    vehicle: 'Toyota Etios XLS 2016',
    service: 'Detailing exterior',
    status: 'confirmed',
  },
] as const;

export const seedServices: DetailingService[] = [
  { id: 's1', name: 'Lavado premium', desc: 'Lavado exterior e interior con productos de alta gama.' },
  { id: 's2', name: 'Detailing exterior', desc: 'Descontaminación de pintura y realce del color.' },
  { id: 's3', name: 'Detailing interior', desc: 'Limpieza profunda de tapizados, plásticos y detalles.' },
  { id: 's4', name: 'Pulido', desc: 'Corrección de imperfecciones en la pintura.' },
  { id: 's5', name: 'Protección', desc: 'Sellador o cerámico para proteger la pintura.' },
  { id: 's6', name: 'Tratamientos especiales', desc: 'Cuero, tapizados y superficies específicas.' },
];

/** Servicios del flujo simplificado de reserva + extras opcionales. */
export const simpleServiceNames = ['Detailing interior', 'Detailing exterior'];
export const extraServiceNames = ['Protección', 'Pulido'];

export const seedSettings: AgencySettings = {
  name: '5848 Motors',
  address: 'Gaboto 5848, Mar del Plata',
  phone: '',
  whatsapp: '',
  email: 'contacto@5848motors.com.ar',
  instagram: '@5848motors',
  hoursWeek: '',
  hoursSat: '',
  detailingDailyCapacity: 3,
  detailingDropoff: '09:00',
  detailingPickup: '18:00',
};

export const seedNotificationPrefs: NotificationPrefs = {
  newLead: true,
  pendingTurno: true,
  upcomingTurno: true,
  dailySummary: false,
  lowStock: true,
};

export const notificationDefs: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'newLead', label: 'Nueva consulta o lead', description: 'Cuando alguien consulta por un vehículo.' },
  { key: 'pendingTurno', label: 'Turno pendiente de confirmar', description: 'Turnos de detailing sin confirmar.' },
  { key: 'upcomingTurno', label: 'Turno próximo', description: '30 minutos antes de un turno confirmado.' },
  { key: 'dailySummary', label: 'Resumen diario', description: 'Envío por email con el resumen del día.' },
  { key: 'lowStock', label: 'Vehículo requiere atención', description: 'Documentación, fotos o precios pendientes.' },
];

export const seedActionAlerts: ActionAlert[] = [
  {
    id: 'a1',
    type: 'urgent',
    title: '4 consultas sin responder',
    description: 'Algunas llevan más de 2 horas esperando.',
    actionLabel: 'Ver consultas',
    href: '/admin/consultas',
  },
  {
    id: 'a2',
    type: 'important',
    title: '2 turnos pendientes de confirmar',
    description: 'Detailing de hoy y mañana.',
    actionLabel: 'Ver turnos',
    href: '/admin/detailing',
  },
  {
    id: 'a3',
    type: 'pending',
    title: '1 vehículo con documentación pendiente',
    description: 'Toyota Hilux SW4 SRX — falta cédula verde.',
    actionLabel: 'Revisar vehículo',
    href: '/admin/vehiculos',
  },
  {
    id: 'a4',
    type: 'important',
    title: '3 leads nuevos',
    description: 'Todavía sin contactar.',
    actionLabel: 'Ver leads',
    href: '/admin/consultas',
  },
];

export const seedVehicleAlerts: VehicleAlert[] = [
  { vehicle: 'Toyota Hilux SW4 SRX', issue: 'Documentación pendiente', actionLabel: 'Resolver' },
  { vehicle: 'Honda PCX Deluxe', issue: 'Fotos pendientes', actionLabel: 'Agregar fotos' },
  { vehicle: 'Volkswagen Fox Comfort', issue: 'Precio pendiente de actualización', actionLabel: 'Editar vehículo' },
  { vehicle: 'Fiat Palio Essence', issue: 'Gastos sin categorizar', actionLabel: 'Revisar gastos' },
];

export const seedActivity: ActivityEntry[] = [
  { time: '08:42', text: 'Se agregó Toyota Etios XLS al catálogo.' },
  { time: '08:31', text: 'Juan Pérez confirmó su turno de detailing.' },
  { time: '08:15', text: 'Nueva consulta sobre Fiat Palio Essence.' },
  { time: 'Ayer 18:43', text: 'Se actualizó el precio de Toyota Hilux SW4 SRX.' },
];

export const seedNotifications: AdminNotification[] = [
  { text: 'Nueva consulta sobre Volkswagen Fox Comfort.', time: 'Hace 15 min' },
  { text: 'Turno de María Gómez pendiente de confirmar.', time: 'Hace 40 min' },
  { text: 'Consulta de Lucas Fernández sin responder hace más de 2 h.', time: 'Hace 2 h' },
  { text: 'Se cargó Toyota Etios XLS al catálogo.', time: 'Ayer' },
];

export const seedBusinessMetrics: BusinessMetric[] = [
  { label: 'Capital invertido', value: '$ 284,5M', delta: '' },
  { label: 'Valor potencial del stock', value: '$ 323,4M', delta: '+6% vs. mes anterior', deltaTone: 'positive' },
  { label: 'Margen potencial', value: '$ 38,9M', delta: '' },
  { label: 'Ventas del mes', value: '12', delta: '+12% vs. mes anterior', deltaTone: 'positive' },
  { label: 'Margen realizado', value: '$ 6,1M', delta: '-4% vs. mes anterior', deltaTone: 'negative' },
];

export const processSteps = [
  { n: '01', label: 'Elegís', desc: 'Recorrés el stock y encontrás el vehículo que te interesa.' },
  { n: '02', label: 'Consultás', desc: 'Nos escribís por el vehículo, sin compromiso.' },
  { n: '03', label: 'Conocés el vehículo', desc: 'Lo ves en persona en Gaboto 5848.' },
  { n: '04', label: 'Coordinamos', desc: 'Definimos forma de pago, permuta o financiación.' },
  { n: '05', label: 'Te llevás tu auto', desc: 'Cerramos la operación con la documentación al día.' },
];
