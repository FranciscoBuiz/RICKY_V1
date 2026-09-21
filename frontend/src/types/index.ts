export type VehicleStatus = 'available' | 'reserved' | 'sold';

/** Una foto del vehículo. `src` es una ruta pública servida desde `public/`. */
export interface VehicleImage {
  src: string;
  alt: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  mileage: number;
  fuel: 'Nafta' | 'Diesel' | 'Nafta/GNC';
  transmission: 'Manual' | 'Automática';
  bodyType: 'Sedán' | 'SUV' | 'Hatchback' | 'Pick-up' | 'Moto';
  /** En dólares: es la moneda en la que la agencia publica. */
  price: number;
  status: VehicleStatus;
  featured: boolean;
  color: string;
  location: string;
  /**
   * Vacío mientras el vehículo no tenga fotos cargadas. La UI cae al marcador
   * de bandas en ese caso: es lo que va a ver cualquier vehículo que el panel
   * dé de alta, porque todavía no hay forma de subir fotos.
   */
  images: VehicleImage[];
  /* Opcionales: los seis vehículos reales no traen estos datos y el Principio 2
     de PRODUCT.md prohíbe rellenarlos. La ficha omite la fila que falta. */
  engine?: string;
  traction?: string;
  doors?: number;
  description?: string;
  /** Interno — sólo se expone en el panel admin. */
  purchasePrice: number;
  expenses: number;
}

/** Vehículo tal como lo consume el sitio público (sin datos de costo). */
export type PublicVehicle = Omit<Vehicle, 'purchasePrice' | 'expenses'>;

export interface VehicleQuery {
  brand?: string;
  bodyType?: string;
  fuel?: string;
  transmission?: string;
  status?: string;
  search?: string;
  sort?: VehicleSort;
  featured?: boolean;
  /** Precio máximo en pesos. El precio es el primer filtro de todo usado. */
  priceMax?: number;
}

export type VehicleSort = 'featured' | 'recent' | 'price_asc' | 'price_desc' | 'km_asc';

export type LeadStatus = 'new' | 'contacted' | 'negotiating' | 'closed' | 'discarded';
export type LeadSource = 'Web' | 'WhatsApp' | 'Instagram' | 'Vendé tu auto';

export interface Lead {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  vehicle: string;
  origin: LeadSource;
  date: string;
  createdAt: string;
  message: string;
  status: LeadStatus;
  reply?: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Appointment {
  id: string;
  client: string;
  vehicle: string;
  /** Uno o varios servicios, separados por coma. */
  service: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Hora de entrega del vehículo. El turno ocupa el día entero. */
  time: string;
  phone: string;
  email: string;
  plate: string;
  status: AppointmentStatus;
}

/** Cupo de una fecha del calendario de detailing. */
export interface DayAvailability {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Turnos ya tomados ese día (sin contar los cancelados). */
  booked: number;
  /** Cupo máximo configurado en el panel. */
  capacity: number;
  available: boolean;
}

export interface DetailingService {
  id: string;
  name: string;
  desc: string;
}

export interface SellRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  brand: string;
  model: string;
  version: string;
  year: string;
  mileage: string;
  plate: string;
  color: string;
  condition: string;
  service: string;
  accidents: string;
  notes: string;
  imageCount: number;
  createdAt: string;
}

export interface AgencySettings {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  hoursWeek: string;
  hoursSat: string;
  /** Turnos de detailing que se aceptan por día. */
  detailingDailyCapacity: number;
  /** Hora en la que se recibe el vehículo. */
  detailingDropoff: string;
  /** Hora en la que se devuelve. */
  detailingPickup: string;
}

export type UserRole = 'Administrador' | 'Editor' | 'Solo lectura';

export interface PanelUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'pending';
}

export type NotificationKey =
  | 'newLead'
  | 'pendingTurno'
  | 'upcomingTurno'
  | 'dailySummary'
  | 'lowStock';

export type NotificationPrefs = Record<NotificationKey, boolean>;

export interface ActivityEntry {
  time: string;
  text: string;
}

export interface AdminNotification {
  text: string;
  time: string;
}

export interface VehicleAlert {
  vehicle: string;
  issue: string;
  actionLabel: string;
}

export type ActionAlertType = 'urgent' | 'important' | 'pending';

export interface ActionAlert {
  id: string;
  type: ActionAlertType;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

export interface BusinessMetric {
  label: string;
  value: string;
  delta: string;
  deltaTone?: 'positive' | 'negative';
  /** Sale de los costos internos: no viaja al rol que sólo mira. */
  interno?: boolean;
}

/**
 * Un vehículo tal como lo recibe el panel. Los costos internos son opcionales
 * porque el rol "Solo lectura" los recibe ausentes: el tipo obliga a la vista a
 * decidir qué hace sin ellos, en vez de mostrar un cero que mentiría.
 */
export type PanelVehicle = Omit<Vehicle, 'purchasePrice' | 'expenses'> & {
  purchasePrice?: number;
  expenses?: number;
};

export interface StockSummary {
  total: number;
  available: number;
  reserved: number;
  sold: number;
}

export interface DashboardPayload {
  alerts: ActionAlert[];
  vehicleAlerts: VehicleAlert[];
  activity: ActivityEntry[];
  notifications: AdminNotification[];
  stock: StockSummary;
  businessMetrics: BusinessMetric[];
}

export interface ApiError {
  error: string;
}
