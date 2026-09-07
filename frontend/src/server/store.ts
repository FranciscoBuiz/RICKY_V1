import {
  notificationDefs,
  seedActionAlerts,
  seedActivity,
  seedAppointments,
  seedBusinessMetrics,
  seedLeads,
  seedNotificationPrefs,
  seedNotifications,
  seedServices,
  seedSettings,
  seedUsers,
  seedVehicleAlerts,
} from '@/server/data/crm';
import { seedVehicles } from '@/server/data/vehicles';
import type {
  AgencySettings,
  Appointment,
  DashboardPayload,
  DayAvailability,
  DetailingService,
  Lead,
  NotificationPrefs,
  PanelUser,
  PublicVehicle,
  SellRequest,
  StockSummary,
  Vehicle,
  VehicleQuery,
  VehicleSort,
} from '@/types';

/**
 * Store en memoria. Cumple el rol de la capa de datos del backend: las rutas de
 * la API sólo hablan con esto, así que reemplazarlo por una base real no toca
 * la UI. Se guarda en `globalThis` para sobrevivir al hot-reload de Next.
 */
interface Store {
  vehicles: Vehicle[];
  leads: Lead[];
  appointments: Appointment[];
  services: DetailingService[];
  settings: AgencySettings;
  users: PanelUser[];
  notificationPrefs: NotificationPrefs;
  sellRequests: SellRequest[];
  seq: number;
}

const globalStore = globalThis as unknown as { __m5848Store?: Store };

function createStore(): Store {
  return {
    vehicles: seedVehicles.map((v) => ({ ...v })),
    leads: seedLeads.map((l) => ({ ...l })),
    appointments: seedAppointments.map((a) => ({ ...a })),
    services: seedServices.map((s) => ({ ...s })),
    settings: { ...seedSettings },
    users: seedUsers.map((u) => ({ ...u })),
    notificationPrefs: { ...seedNotificationPrefs },
    sellRequests: [],
    seq: 1,
  };
}

export function store(): Store {
  if (!globalStore.__m5848Store) globalStore.__m5848Store = createStore();
  return globalStore.__m5848Store;
}

function nextId(prefix: string): string {
  const s = store();
  s.seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${s.seq}`;
}

/* ------------------------------------------------------------------ vehicles */

export function toPublicVehicle(v: Vehicle): PublicVehicle {
  const { purchasePrice: _purchasePrice, expenses: _expenses, ...rest } = v;
  return rest;
}

function sortVehicles(list: Vehicle[], sort: VehicleSort): Vehicle[] {
  const copy = [...list];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'km_asc':
      return copy.sort((a, b) => a.mileage - b.mileage);
    case 'recent':
      return copy.sort((a, b) => b.year - a.year);
    default:
      return copy;
  }
}

export function listVehicles(query: VehicleQuery = {}): Vehicle[] {
  const { brand, bodyType, fuel, transmission, status, search, featured, priceMax } = query;
  const term = search?.trim().toLowerCase() ?? '';

  const filtered = store().vehicles.filter((v) => {
    if (brand && brand !== 'all' && v.brand !== brand) return false;
    if (bodyType && bodyType !== 'all' && v.bodyType !== bodyType) return false;
    if (fuel && fuel !== 'all' && v.fuel !== fuel) return false;
    if (transmission && transmission !== 'all' && v.transmission !== transmission) return false;
    if (status && status !== 'all' && v.status !== status) return false;
    if (featured && !v.featured) return false;
    if (priceMax && v.price > priceMax) return false;
    if (term && !`${v.brand} ${v.model} ${v.version}`.toLowerCase().includes(term)) return false;
    return true;
  });

  return sortVehicles(filtered, query.sort ?? 'featured');
}

export function getVehicle(id: string): Vehicle | undefined {
  return store().vehicles.find((v) => v.id === id);
}

export type VehicleInput = Partial<Omit<Vehicle, 'id'>>;

export function createVehicle(input: VehicleInput): Vehicle {
  const vehicle: Vehicle = {
    id: nextId('v'),
    brand: '',
    model: '',
    version: '',
    year: new Date().getFullYear(),
    mileage: 0,
    fuel: 'Nafta',
    transmission: 'Manual',
    bodyType: 'Sedán',
    price: 0,
    status: 'available',
    featured: false,
    engine: '',
    traction: '',
    color: '',
    doors: 4,
    location: 'Mar del Plata',
    description: '',
    purchasePrice: 0,
    expenses: 0,
    ...input,
  };
  store().vehicles.unshift(vehicle);
  return vehicle;
}

export function updateVehicle(id: string, input: VehicleInput): Vehicle | undefined {
  const s = store();
  const index = s.vehicles.findIndex((v) => v.id === id);
  if (index === -1) return undefined;
  s.vehicles[index] = { ...s.vehicles[index], ...input, id };
  return s.vehicles[index];
}

export function deleteVehicle(id: string): boolean {
  const s = store();
  const index = s.vehicles.findIndex((v) => v.id === id);
  if (index === -1) return false;
  s.vehicles.splice(index, 1);
  return true;
}

export function stockSummary(): StockSummary {
  const list = store().vehicles;
  return {
    total: list.length,
    available: list.filter((v) => v.status === 'available').length,
    reserved: list.filter((v) => v.status === 'reserved').length,
    sold: list.filter((v) => v.status === 'sold').length,
  };
}

/* --------------------------------------------------------------------- leads */

export function listLeads(): Lead[] {
  return store().leads;
}

export function getLead(id: string): Lead | undefined {
  return store().leads.find((l) => l.id === id);
}

export interface LeadInput {
  name: string;
  phone?: string;
  email?: string;
  vehicle?: string;
  origin?: Lead['origin'];
  message?: string;
}

export function createLead(input: LeadInput): Lead {
  const now = new Date();
  const contactParts = [input.phone, input.email].filter(Boolean);
  const lead: Lead = {
    id: nextId('l'),
    name: input.name,
    contact: contactParts.join(' · '),
    phone: input.phone ?? '',
    email: input.email ?? '',
    vehicle: input.vehicle ?? '—',
    origin: input.origin ?? 'Web',
    date: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`,
    createdAt: now.toISOString(),
    message: input.message ?? '',
    status: 'new',
  };
  store().leads.unshift(lead);
  return lead;
}

export function updateLead(id: string, patch: Partial<Pick<Lead, 'status' | 'reply'>>): Lead | undefined {
  const s = store();
  const index = s.leads.findIndex((l) => l.id === id);
  if (index === -1) return undefined;
  s.leads[index] = { ...s.leads[index], ...patch };
  return s.leads[index];
}

/* -------------------------------------------------------------- appointments */

export function listAppointments(): Appointment[] {
  return [...store().appointments].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  );
}

export interface AppointmentInput {
  client: string;
  vehicle?: string;
  service: string;
  date: string;
  /** Opcional: por defecto toma la hora de entrega configurada en el panel. */
  time?: string;
  phone?: string;
  email?: string;
  plate?: string;
}

export function createAppointment(input: AppointmentInput): Appointment {
  const appointment: Appointment = {
    id: nextId('t'),
    client: input.client,
    vehicle: input.vehicle ?? '',
    service: input.service,
    date: input.date,
    time: input.time ?? getSettings().detailingDropoff,
    phone: input.phone ?? '',
    email: input.email ?? '',
    plate: input.plate ?? '',
    status: 'pending',
  };
  store().appointments.push(appointment);
  return appointment;
}

export function updateAppointment(
  id: string,
  patch: Partial<Pick<Appointment, 'status' | 'date' | 'time'>>,
): Appointment | undefined {
  const s = store();
  const index = s.appointments.findIndex((a) => a.id === id);
  if (index === -1) return undefined;
  s.appointments[index] = { ...s.appointments[index], ...patch };
  return s.appointments[index];
}

/**
 * Los turnos de detailing ocupan el día entero: el vehículo se entrega a
 * primera hora y se retira a última. Por eso no hay grilla de horarios, sino un
 * cupo diario que se configura en el panel.
 */
export function bookedOn(date: string): number {
  return store().appointments.filter((a) => a.date === date && a.status !== 'cancelled').length;
}

export function dayAvailability(date: string): DayAvailability {
  const capacity = Math.max(0, getSettings().detailingDailyCapacity);
  const booked = bookedOn(date);
  return { date, booked, capacity, available: booked < capacity };
}

/** Cupo de `days` fechas consecutivas a partir de `from` (YYYY-MM-DD). */
export function listAvailability(from: string, days: number): DayAvailability[] {
  const start = new Date(`${from}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];

  return Array.from({ length: Math.max(0, Math.min(days, 90)) }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    return dayAvailability(iso);
  });
}

/* ------------------------------------------------------------------ services */

export function listServices(): DetailingService[] {
  return store().services;
}

/* -------------------------------------------------------------- sell requests */

export function listSellRequests(): SellRequest[] {
  return store().sellRequests;
}

export function createSellRequest(input: Omit<SellRequest, 'id' | 'createdAt'>): SellRequest {
  const request: SellRequest = { ...input, id: nextId('sr'), createdAt: new Date().toISOString() };
  store().sellRequests.unshift(request);
  createLead({
    name: input.name,
    phone: input.phone,
    email: input.email,
    vehicle: `${input.brand} ${input.model} ${input.year}`.trim(),
    origin: 'Vendé tu auto',
    message: input.notes || 'Quiere vender su vehículo.',
  });
  return request;
}

/* ------------------------------------------------------------------ settings */

export function getSettings(): AgencySettings {
  return store().settings;
}

export function updateSettings(patch: Partial<AgencySettings>): AgencySettings {
  const s = store();
  s.settings = { ...s.settings, ...patch };
  return s.settings;
}

export function listUsers(): PanelUser[] {
  return store().users;
}

export function inviteUser(email: string, role: PanelUser['role']): PanelUser {
  const user: PanelUser = {
    id: nextId('u'),
    name: email.split('@')[0],
    email,
    role,
    status: 'pending',
  };
  store().users.push(user);
  return user;
}

export function removeUser(id: string): boolean {
  const s = store();
  const index = s.users.findIndex((u) => u.id === id);
  if (index === -1) return false;
  s.users.splice(index, 1);
  return true;
}

export function getNotificationPrefs(): NotificationPrefs {
  return store().notificationPrefs;
}

export function updateNotificationPrefs(patch: Partial<NotificationPrefs>): NotificationPrefs {
  const s = store();
  s.notificationPrefs = { ...s.notificationPrefs, ...patch };
  return s.notificationPrefs;
}

export { notificationDefs };

/* ----------------------------------------------------------------- dashboard */

export function dashboardPayload(): DashboardPayload {
  return {
    alerts: seedActionAlerts,
    vehicleAlerts: seedVehicleAlerts,
    activity: seedActivity,
    notifications: seedNotifications,
    stock: stockSummary(),
    businessMetrics: seedBusinessMetrics,
  };
}
