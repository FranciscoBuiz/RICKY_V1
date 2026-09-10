import type { Vehicle, VehicleImage } from '@/types';

/**
 * Las fotos viven en `public/vehiculos/<id>/NN.jpg`, numeradas desde 01 en el
 * orden en que se muestran. El alt nombra el vehículo y nada más: nadie rotuló
 * qué muestra cada toma, y un alt que afirma "interior" sobre una foto del baúl
 * es peor que no tenerlo.
 */
function fotos(id: string, cantidad: number, alt: string): VehicleImage[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    src: `/vehiculos/${id}/${String(i + 1).padStart(2, '0')}.jpg`,
    alt: i === 0 ? alt : `${alt}, foto ${i + 1}`,
  }));
}

/**
 * Los seis vehículos reales de la agencia. Los ids son los que ya se
 * compartieron por WhatsApp: no se tocan nunca.
 *
 * `price` está en dólares, que es como la agencia publica. `purchasePrice` y
 * `expenses` quedan en 0 porque son costos reales que no tenemos, y el panel
 * muestra "sin cargar" en lugar de calcular un margen falso.
 */
export const seedVehicles: Vehicle[] = [
  {
    id: 'etios17',
    brand: 'Toyota',
    model: 'Etios',
    version: 'XLS',
    year: 2017,
    mileage: 142000,
    fuel: 'Nafta/GNC',
    transmission: 'Manual',
    bodyType: 'Sedán',
    price: 12900,
    status: 'available',
    featured: true,
    color: 'Blanco',
    location: 'Mar del Plata',
    images: fotos('etios17', 10, 'Toyota Etios XLS 2017 blanco'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'hilux18',
    brand: 'Toyota',
    model: 'Hilux SW4',
    version: 'SRX',
    year: 2018,
    mileage: 191860,
    fuel: 'Diesel',
    transmission: 'Automática',
    bodyType: 'SUV',
    price: 38000,
    status: 'available',
    featured: false,
    color: 'Blanco perla',
    location: 'Mar del Plata',
    images: fotos('hilux18', 9, 'Toyota Hilux SW4 SRX 2018 blanco perla'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'palio15',
    brand: 'Fiat',
    model: 'Palio',
    version: 'Essence 1.6 16v',
    year: 2015,
    mileage: 106000,
    fuel: 'Nafta',
    transmission: 'Manual',
    bodyType: 'Hatchback',
    price: 9500,
    status: 'available',
    featured: false,
    color: 'Blanco',
    location: 'Mar del Plata',
    images: fotos('palio15', 8, 'Fiat Palio Essence 1.6 16v 2015 blanco'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'fox17',
    brand: 'Volkswagen',
    model: 'Fox',
    version: 'Comfort',
    year: 2017,
    mileage: 138000,
    fuel: 'Nafta',
    transmission: 'Manual',
    bodyType: 'Hatchback',
    price: 10200,
    status: 'available',
    featured: false,
    color: 'Negro',
    location: 'Mar del Plata',
    images: fotos('fox17', 7, 'Volkswagen Fox Comfort 2017 negro'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'etios16',
    brand: 'Toyota',
    model: 'Etios',
    version: 'XLS',
    year: 2016,
    mileage: 101000,
    fuel: 'Nafta',
    transmission: 'Manual',
    bodyType: 'Sedán',
    price: 12500,
    status: 'available',
    featured: false,
    color: 'Blanco',
    location: 'Mar del Plata',
    images: fotos('etios16', 6, 'Toyota Etios XLS 2016 blanco'),
    purchasePrice: 0,
    expenses: 0,
  },
  {
    id: 'pcx26',
    brand: 'Honda',
    model: 'PCX',
    version: 'Deluxe',
    year: 2026,
    /* 0 km. El badge "0 km" se deriva de acá y no de un estado aparte: el
       kilometraje y la disponibilidad son dos cosas distintas. */
    mileage: 0,
    fuel: 'Nafta',
    transmission: 'Automática',
    bodyType: 'Moto',
    price: 7500,
    status: 'available',
    featured: false,
    color: 'Azul',
    location: 'Mar del Plata',
    images: fotos('pcx26', 5, 'Honda PCX Deluxe 0 km azul'),
    purchasePrice: 0,
    expenses: 0,
  },
];

export const brandOptions = ['Toyota', 'Fiat', 'Volkswagen', 'Honda'];
export const bodyTypeOptions = ['Sedán', 'SUV', 'Hatchback', 'Moto'];
export const fuelOptions = ['Nafta', 'Diesel', 'Nafta/GNC'];
export const transmissionOptions = ['Manual', 'Automática'];
