import { normalizeText } from '@/lib/format';

/**
 * Catálogo de marcas, modelos y versiones para sugerir mientras el visitante
 * tipea su vehículo.
 *
 * No es lo mismo que `brandOptions` de `@/server/data/vehicles`: aquéllas son
 * las marcas que hay **en stock** y filtran el catálogo; esto es el universo de
 * lo que alguien puede querer vendernos, así que es más largo y no depende de
 * los datos del negocio.
 *
 * Es una sugerencia, no una restricción: los campos siguen aceptando cualquier
 * texto. Por eso la cobertura es best-effort — las marcas están completas, los
 * modelos cubren lo que se vende en Argentina y las versiones sólo los modelos
 * de mayor volumen. Donde no hay datos, el campo simplemente no sugiere.
 */

export const CAR_BRANDS = [
  'Alfa Romeo',
  'Audi',
  'BAIC',
  'BMW',
  'BYD',
  'Changan',
  'Chery',
  'Chevrolet',
  'Chrysler',
  'Citroën',
  'Daihatsu',
  'Dodge',
  'DS',
  'Fiat',
  'Ford',
  'Foton',
  'Geely',
  'Great Wall',
  'Haval',
  'Honda',
  'Hyundai',
  'Isuzu',
  'Iveco',
  'JAC',
  'Jaguar',
  'Jeep',
  'Kia',
  'Land Rover',
  'Lexus',
  'Lifan',
  'Mahindra',
  'Maserati',
  'Mazda',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Peugeot',
  'Porsche',
  'RAM',
  'Renault',
  'Seat',
  'Shineray',
  'Smart',
  'SsangYong',
  'Subaru',
  'Suzuki',
  'Toyota',
  'Volkswagen',
  'Volvo',
];

export const MODELS_BY_BRAND: Record<string, string[]> = {
  'Alfa Romeo': ['Giulia', 'Giulietta', 'Mito', 'Stelvio'],
  Audi: ['A1', 'A3', 'A4', 'A5', 'A6', 'Q2', 'Q3', 'Q5', 'Q7', 'TT'],
  BAIC: ['BJ40', 'X35', 'X55'],
  BMW: ['Serie 1', 'Serie 3', 'Serie 4', 'Serie 5', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6'],
  BYD: ['Dolphin', 'Song Plus', 'Yuan Plus'],
  Changan: ['CS15', 'CS35 Plus', 'CS55 Plus'],
  Chery: ['Arrizo 5', 'Tiggo 2', 'Tiggo 3', 'Tiggo 4 Pro', 'Tiggo 8 Pro'],
  Chevrolet: [
    'Agile',
    'Aveo',
    'Captiva',
    'Corsa',
    'Cruze',
    'Equinox',
    'Onix',
    'Prisma',
    'S10',
    'Sonic',
    'Spin',
    'Tracker',
    'Trailblazer',
  ],
  Chrysler: ['300C', 'PT Cruiser'],
  Citroën: ['Berlingo', 'C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C4 Lounge', 'C-Elysée'],
  Daihatsu: ['Terios'],
  Dodge: ['Journey', 'RAM 1500'],
  DS: ['DS3', 'DS4', 'DS7'],
  Fiat: [
    'Argo',
    'Cronos',
    'Fiorino',
    'Idea',
    'Mobi',
    'Palio',
    'Pulse',
    'Punto',
    'Siena',
    'Strada',
    'Toro',
    'Uno',
  ],
  Ford: [
    'Bronco Sport',
    'EcoSport',
    'Fiesta',
    'Focus',
    'Ka',
    'Kuga',
    'Maverick',
    'Mondeo',
    'Ranger',
    'Territory',
    'Transit',
  ],
  Foton: ['Tunland'],
  Geely: ['Emgrand', 'Coolray'],
  'Great Wall': ['Poer', 'Wingle'],
  Haval: ['H6', 'Jolion'],
  Honda: ['City', 'Civic', 'CR-V', 'Fit', 'HR-V', 'WR-V'],
  Hyundai: ['Accent', 'Creta', 'Elantra', 'HB20', 'i10', 'i30', 'Santa Fe', 'Tucson'],
  Isuzu: ['D-Max'],
  Iveco: ['Daily'],
  JAC: ['S2', 'S3', 'T6', 'T8'],
  Jaguar: ['E-Pace', 'F-Pace', 'XE', 'XF'],
  Jeep: ['Cherokee', 'Commander', 'Compass', 'Grand Cherokee', 'Renegade', 'Wrangler'],
  Kia: ['Cerato', 'Picanto', 'Rio', 'Seltos', 'Sorento', 'Soul', 'Sportage'],
  'Land Rover': ['Defender', 'Discovery', 'Evoque', 'Freelander', 'Range Rover'],
  Lexus: ['ES', 'NX', 'RX', 'UX'],
  Lifan: ['X60', 'Myway'],
  Mahindra: ['Pik Up', 'XUV500'],
  Maserati: ['Ghibli', 'Levante'],
  Mazda: ['CX-5', 'CX-30', 'Mazda 3'],
  'Mercedes-Benz': ['Clase A', 'Clase B', 'Clase C', 'Clase E', 'GLA', 'GLB', 'GLC', 'Sprinter', 'Vito'],
  Mini: ['Clubman', 'Cooper', 'Countryman'],
  Mitsubishi: ['ASX', 'L200', 'Montero', 'Outlander'],
  Nissan: ['Frontier', 'Kicks', 'March', 'Note', 'Sentra', 'Versa', 'X-Trail'],
  Peugeot: ['206', '207', '208', '301', '308', '408', '2008', '3008', '5008', 'Partner'],
  Porsche: ['718', '911', 'Cayenne', 'Macan'],
  RAM: ['1500', '2500', 'Rampage'],
  Renault: [
    'Alaskan',
    'Captur',
    'Clio',
    'Duster',
    'Fluence',
    'Kangoo',
    'Koleos',
    'Kwid',
    'Logan',
    'Master',
    'Oroch',
    'Sandero',
    'Stepway',
  ],
  Seat: ['Ibiza', 'León', 'Toledo'],
  Shineray: ['T30', 'X30'],
  Smart: ['Fortwo'],
  SsangYong: ['Actyon', 'Korando', 'Rexton'],
  Subaru: ['Forester', 'Impreza', 'Outback', 'XV'],
  Suzuki: ['Baleno', 'Fun', 'Grand Vitara', 'Jimny', 'Swift', 'Vitara'],
  Toyota: [
    '4Runner',
    'Corolla',
    'Corolla Cross',
    'Etios',
    'Hiace',
    'Hilux',
    'Prius',
    'RAV4',
    'SW4',
    'Yaris',
  ],
  Volkswagen: [
    'Amarok',
    'Bora',
    'Fox',
    'Gol',
    'Gol Trend',
    'Golf',
    'Nivus',
    'Polo',
    'Saveiro',
    'Suran',
    'Taos',
    'T-Cross',
    'Tiguan',
    'Up!',
    'Vento',
  ],
  Volvo: ['S60', 'XC40', 'XC60', 'XC90'],
};

/**
 * Versiones por modelo, indexadas por `"Marca|Modelo"` para que dos modelos
 * homónimos de marcas distintas no se pisen.
 */
export const VERSIONS_BY_MODEL: Record<string, string[]> = {
  'Chevrolet|Cruze': ['LS', 'LT', 'LTZ', 'Premier', 'RS'],
  'Chevrolet|Onix': ['Joy', 'LS', 'LT', 'LTZ', 'Premier', 'RS'],
  'Chevrolet|S10': ['LS', 'LT', 'LTZ', 'High Country', 'Z71'],
  'Chevrolet|Spin': ['LS', 'LT', 'LTZ', 'Activ', 'Premier'],
  'Chevrolet|Tracker': ['LS', 'LT', 'LTZ', 'Premier', 'RS'],
  'Citroën|C3': ['Feel', 'Live', 'Shine', 'Origine'],
  'Citroën|C4 Cactus': ['Feel', 'Feel Pack', 'Shine', 'Vti'],
  'Fiat|Argo': ['Drive', 'Precision', 'Trekking', 'HGT'],
  'Fiat|Cronos': ['Drive', 'Like', 'Precision', 'S-Design'],
  'Fiat|Pulse': ['Drive', 'Audace', 'Impetus', 'Abarth'],
  'Fiat|Strada': ['Endurance', 'Freedom', 'Volcano', 'Ranch'],
  'Fiat|Toro': ['Endurance', 'Freedom', 'Volcano', 'Ranch', 'Ultra'],
  'Ford|EcoSport': ['S', 'SE', 'SES', 'Titanium', 'Storm', 'Freestyle'],
  'Ford|Fiesta': ['S', 'SE', 'SE Plus', 'Titanium', 'Kinetic'],
  'Ford|Focus': ['S', 'SE', 'SE Plus', 'Titanium', 'ST'],
  'Ford|Ka': ['S', 'SE', 'SE Plus', 'Freestyle'],
  'Ford|Maverick': ['XL', 'XLT', 'Lariat', 'Tremor'],
  'Ford|Ranger': ['XL', 'XLS', 'XLT', 'Limited', 'Raptor', 'Storm', 'Wildtrak'],
  'Ford|Territory': ['SEL', 'Titanium'],
  'Honda|Civic': ['LX', 'EX', 'EXL', 'Sport', 'Touring', 'Type R'],
  'Honda|HR-V': ['LX', 'EX', 'EXL', 'Touring'],
  'Hyundai|Creta': ['GL', 'GLS', 'Safety', 'Premium', 'Limited'],
  'Hyundai|Tucson': ['GL', 'GLS', 'Premium', 'Limited'],
  'Jeep|Compass': ['Sport', 'Longitude', 'Limited', 'Trailhawk', 'Serie S'],
  'Jeep|Renegade': ['Sport', 'Longitude', 'Limited', 'Trailhawk', 'Serie S'],
  'Kia|Sportage': ['LX', 'EX', 'SX', 'GT Line'],
  'Mitsubishi|L200': ['GLS', 'GLX', 'Triton', 'Sport'],
  'Nissan|Frontier': ['S', 'SE', 'XE', 'LE', 'Pro-4X'],
  'Nissan|Kicks': ['Sense', 'Advance', 'Exclusive'],
  'Nissan|Versa': ['Sense', 'Advance', 'Exclusive'],
  'Peugeot|206': ['XR', 'XS', 'XT', 'Feline'],
  'Peugeot|207': ['XR', 'XS', 'XT', 'Allure', 'Feline'],
  'Peugeot|208': ['Active', 'Allure', 'Feline', 'GT', 'Like', 'Style'],
  'Peugeot|2008': ['Active', 'Allure', 'Feline', 'GT'],
  'Peugeot|308': ['Active', 'Allure', 'Feline', 'GT'],
  'Peugeot|408': ['Active', 'Allure', 'Feline', 'GT'],
  'Renault|Duster': ['Confort', 'Dynamique', 'Intens', 'Privilege', 'Oroch'],
  'Renault|Kangoo': ['Confort', 'Express', 'Life', 'Zen'],
  'Renault|Kwid': ['Life', 'Zen', 'Intens', 'Iconic', 'Outsider'],
  'Renault|Logan': ['Authentique', 'Expression', 'Life', 'Zen', 'Intens'],
  'Renault|Sandero': ['Authentique', 'Expression', 'Life', 'Zen', 'Intens', 'RS'],
  'Renault|Stepway': ['Dynamique', 'Zen', 'Intens', 'Privilege'],
  'Suzuki|Jimny': ['JLX', 'GLX', 'Sierra', '4All'],
  'Toyota|Corolla': ['XLI', 'XEI', 'SEG', 'GR-S', 'XLS'],
  'Toyota|Corolla Cross': ['XLI', 'XEI', 'SEG', 'GR-S'],
  'Toyota|Etios': ['X', 'XS', 'XLS', 'Platinum'],
  'Toyota|Hilux': ['DX', 'SR', 'SRV', 'SRX', 'GR-S', 'Conquest'],
  'Toyota|RAV4': ['XLE', 'Limited', 'Hybrid'],
  'Toyota|SW4': ['SR', 'SRX', 'Limited', 'Diamond'],
  'Toyota|Yaris': ['XS', 'XLS', 'S', 'Sedán'],
  'Volkswagen|Amarok': ['Trendline', 'Comfortline', 'Highline', 'Extreme', 'V6', 'Black Style'],
  'Volkswagen|Gol Trend': ['Trendline', 'Comfortline', 'Highline', 'Pack I'],
  'Volkswagen|Golf': ['Trendline', 'Comfortline', 'Highline', 'GTI', 'GTD'],
  'Volkswagen|Nivus': ['Trendline', 'Comfortline', 'Highline'],
  'Volkswagen|Polo': ['Trendline', 'Comfortline', 'Highline', 'Track', 'GTS'],
  'Volkswagen|Saveiro': ['Trendline', 'Comfortline', 'Highline', 'Cross'],
  'Volkswagen|Taos': ['Trendline', 'Comfortline', 'Highline'],
  'Volkswagen|T-Cross': ['Trendline', 'Comfortline', 'Highline'],
  'Volkswagen|Vento': ['Trendline', 'Comfortline', 'Highline', 'GLI'],
};

/** Todos los modelos del catálogo, sin repetir y ordenados. */
const ALL_MODELS = [...new Set(Object.values(MODELS_BY_BRAND).flat())].sort((a, b) =>
  a.localeCompare(b, 'es'),
);

/** Busca una clave del catálogo ignorando mayúsculas, tildes y espacios de más. */
function findKey(keys: string[], value: string): string | undefined {
  const target = normalizeText(value);
  if (!target) return undefined;
  return keys.find((key) => normalizeText(key) === target);
}

/**
 * Modelos a sugerir para una marca. Si la marca todavía no se eligió (o no está
 * en el catálogo) devuelve todos los modelos, así el visitante puede tipear
 * "corolla" antes que "toyota" y la sugerencia igual aparece.
 */
export function modelsFor(brand: string): string[] {
  const key = findKey(Object.keys(MODELS_BY_BRAND), brand);
  return key ? MODELS_BY_BRAND[key] : ALL_MODELS;
}

/**
 * Versiones a sugerir para un modelo. Acá no hay fallback: una versión suelta,
 * sin saber de qué auto es, no ayuda a nadie.
 */
export function versionsFor(brand: string, model: string): string[] {
  const brandKey = findKey(Object.keys(MODELS_BY_BRAND), brand);
  if (!brandKey) return [];
  const modelKey = findKey(MODELS_BY_BRAND[brandKey], model);
  if (!modelKey) return [];
  return VERSIONS_BY_MODEL[`${brandKey}|${modelKey}`] ?? [];
}
