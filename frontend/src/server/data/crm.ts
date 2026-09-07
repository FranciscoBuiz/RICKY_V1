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
  PanelUser,
  VehicleAlert,
} from '@/types';

/** Fecha base de la agenda del prototipo (semana del 03/09). */
const AGENDA_WEEK = '2026-09';

const day = (d: number) => `${AGENDA_WEEK}-${String(d).padStart(2, '0')}`;

export const seedLeads: Lead[] = [
  {
    id: 'l1',
    name: 'Martina G.',
    contact: '223 555-0111 · martina@example.com',
    phone: '223 555-0111',
    email: 'martina@example.com',
    vehicle: 'Corolla XEi',
    origin: 'Web',
    date: '02/09',
    createdAt: '2026-09-02T10:12:00',
    message: 'Quiero consultar por el Corolla, ¿tiene service oficial?',
    status: 'new',
  },
  {
    id: 'l2',
    name: 'Lucas P.',
    contact: '223 555-0112',
    phone: '223 555-0112',
    email: 'lucas@example.com',
    vehicle: 'T-Cross',
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
    vehicle: 'Ranger XLT',
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
    vehicle: '208 Feline',
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
    vehicle: 'Onix RS',
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
    vehicle: 'Amarok V6',
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
    vehicle: 'Hilux SRX',
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
    vehicle: 'Toyota Corolla XEi 2024',
    message: 'Hola, quería saber si todavía está disponible…',
    minsAgo: 18,
    status: 'new',
  },
  {
    id: 'dl2',
    customerName: 'Martina G.',
    source: 'WhatsApp',
    vehicle: 'T-Cross',
    message: '¿Acepta permuta por un Fiesta 2018?',
    minsAgo: 47,
    status: 'new',
  },
  {
    id: 'dl3',
    customerName: 'Bruno F.',
    source: 'Instagram',
    vehicle: '208 Feline',
    message: 'Consulto precio final del vehículo.',
    minsAgo: 130,
    status: 'new',
  },
  {
    id: 'dl4',
    customerName: 'Sol R.',
    source: 'Web',
    vehicle: 'Ranger XLT',
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
    vehicle: 'Corolla XEi',
    service: 'Detailing exterior',
    date: day(3),
    time: '15:00',
    phone: '223 555-0101',
    email: 'fernando@example.com',
    plate: 'AB 123 CD',
    status: 'pending',
  },
  {
    id: 't2',
    client: 'Carla M.',
    vehicle: 'T-Cross',
    service: 'Lavado premium',
    date: day(4),
    time: '10:00',
    phone: '223 555-0102',
    email: 'carla@example.com',
    plate: 'AC 456 DE',
    status: 'confirmed',
  },
  {
    id: 't3',
    client: 'Nicolás T.',
    vehicle: 'Ranger XLT',
    service: 'Pulido',
    date: day(4),
    time: '13:30',
    phone: '223 555-0103',
    email: 'nicolas@example.com',
    plate: 'AD 789 EF',
    status: 'in_progress',
  },
  {
    id: 't4',
    client: 'Julieta S.',
    vehicle: '208 Feline',
    service: 'Protección',
    date: day(5),
    time: '09:00',
    phone: '223 555-0104',
    email: 'julieta@example.com',
    plate: 'AE 012 FG',
    status: 'completed',
  },
  {
    id: 't5',
    client: 'Marcos D.',
    vehicle: 'Onix RS',
    service: 'Detailing interior',
    date: day(5),
    time: '11:00',
    phone: '223 555-0105',
    email: 'marcos@example.com',
    plate: 'AF 345 GH',
    status: 'cancelled',
  },
  {
    id: 't6',
    client: 'Agustina R.',
    vehicle: 'Amarok V6',
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
    vehicle: 'Toyota Corolla',
    service: 'Detailing exterior',
    status: 'confirmed',
  },
  {
    id: 'ap2',
    time: '10:30',
    customerName: 'María Gómez',
    vehicle: 'Volkswagen T-Cross',
    service: 'Detailing interior',
    status: 'pending',
  },
  {
    id: 'ap3',
    time: '11:30',
    customerName: 'Carlos Rodríguez',
    vehicle: 'Ford Ranger',
    service: 'Lavado premium',
    status: 'confirmed',
  },
  {
    id: 'ap4',
    time: '13:00',
    customerName: 'Lucía Fernández',
    vehicle: 'Peugeot 208',
    service: 'Pulido',
    status: 'in_progress',
  },
  {
    id: 'ap5',
    time: '15:00',
    customerName: 'Agustín Bravo',
    vehicle: 'Chevrolet Onix',
    service: 'Protección',
    status: 'completed',
  },
  {
    id: 'ap6',
    time: '16:30',
    customerName: 'Sofía Martín',
    vehicle: 'VW Amarok',
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

export const seedUsers: PanelUser[] = [
  { id: 'u1', name: 'Francisco Roldán', email: 'francisco@5848motors.com.ar', role: 'Administrador', status: 'active' },
  { id: 'u2', name: 'Valeria Sosa', email: 'valeria@5848motors.com.ar', role: 'Editor', status: 'active' },
  { id: 'u3', name: 'Martín Ibáñez', email: 'martin@5848motors.com.ar', role: 'Solo lectura', status: 'pending' },
];

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
    description: 'Toyota Corolla XEi — falta cédula verde.',
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
  { vehicle: 'Toyota Corolla XEi', issue: 'Documentación pendiente', actionLabel: 'Resolver' },
  { vehicle: 'Volkswagen Golf', issue: 'Fotos pendientes', actionLabel: 'Agregar fotos' },
  { vehicle: 'Ford Ranger', issue: 'Precio pendiente de actualización', actionLabel: 'Editar vehículo' },
  { vehicle: 'Fiat Cronos', issue: 'Gastos sin categorizar', actionLabel: 'Revisar gastos' },
];

export const seedActivity: ActivityEntry[] = [
  { time: '08:42', text: 'Se agregó Toyota Corolla XEi al catálogo.' },
  { time: '08:31', text: 'Juan Pérez confirmó su turno de detailing.' },
  { time: '08:15', text: 'Nueva consulta sobre Volkswagen Golf.' },
  { time: 'Ayer 18:43', text: 'Se actualizó el precio de Ford Ranger.' },
];

export const seedNotifications: AdminNotification[] = [
  { text: 'Nueva consulta sobre Volkswagen Golf.', time: 'Hace 15 min' },
  { text: 'Turno de María Gómez pendiente de confirmar.', time: 'Hace 40 min' },
  { text: 'Consulta de Lucas Fernández sin responder hace más de 2 h.', time: 'Hace 2 h' },
  { text: 'Se cargó Toyota Corolla XEi al catálogo.', time: 'Ayer' },
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
