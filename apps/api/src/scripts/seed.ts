import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  sources,
  listings,
  listingImages,
  priceHistory,
  users,
  userFavorites,
  searchAlerts,
  leads,
  serviceProviders,
  providerServices,
  serviceLeads,
  providerReviews,
  providerPortfolio,
  areaCentroids,
  businessDirectory,
  businessReviews,
} from '../server/infrastructure/database/schema';

// Direct database connection for scripts
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// ============================================
// HELPERS
// ============================================

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const randomItem = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDec = (min: number, max: number, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[áà]/g, 'a')
    .replace(/[éè]/g, 'e')
    .replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o')
    .replace(/[úù]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// ============================================
// DATA POOLS
// ============================================

const UNSPLASH_PROPERTY = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
];

const UNSPLASH_PORTFOLIO = [
  'https://images.unsplash.com/photo-1585128792020-803d29415281?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&h=400&fit=crop',
];

interface CityData {
  name: string;
  province: string;
  lat: number;
  lng: number;
  neighborhoods: { name: string; postalCode: string; lat: number; lng: number; premium: boolean }[];
  basePriceSale: number; // per sqm for apartments
  baseRent: number; // per sqm monthly
}

const CITIES: CityData[] = [
  {
    name: 'Madrid',
    province: 'Madrid',
    lat: 40.4168,
    lng: -3.7038,
    basePriceSale: 4200,
    baseRent: 16,
    neighborhoods: [
      { name: 'Salamanca', postalCode: '28001', lat: 40.4280, lng: -3.6835, premium: true },
      { name: 'Chamberí', postalCode: '28010', lat: 40.4340, lng: -3.7050, premium: true },
      { name: 'Chamartín', postalCode: '28002', lat: 40.4600, lng: -3.6770, premium: true },
      { name: 'Retiro', postalCode: '28009', lat: 40.4130, lng: -3.6770, premium: false },
      { name: 'Centro', postalCode: '28012', lat: 40.4153, lng: -3.7074, premium: false },
      { name: 'Moncloa', postalCode: '28008', lat: 40.4350, lng: -3.7190, premium: false },
      { name: 'Malasaña', postalCode: '28004', lat: 40.4260, lng: -3.7040, premium: false },
      { name: 'Lavapiés', postalCode: '28012', lat: 40.4080, lng: -3.7010, premium: false },
      { name: 'Vallecas', postalCode: '28018', lat: 40.3800, lng: -3.6590, premium: false },
      { name: 'Carabanchel', postalCode: '28025', lat: 40.3860, lng: -3.7430, premium: false },
      { name: 'La Moraleja', postalCode: '28109', lat: 40.4990, lng: -3.6490, premium: true },
      { name: 'Pozuelo de Alarcón', postalCode: '28223', lat: 40.4310, lng: -3.8110, premium: true },
    ],
  },
  {
    name: 'Barcelona',
    province: 'Barcelona',
    lat: 41.3851,
    lng: 2.1734,
    basePriceSale: 4600,
    baseRent: 17,
    neighborhoods: [
      { name: 'Eixample', postalCode: '08007', lat: 41.3890, lng: 2.1620, premium: true },
      { name: 'Sarrià-Sant Gervasi', postalCode: '08017', lat: 41.4010, lng: 2.1310, premium: true },
      { name: 'Pedralbes', postalCode: '08034', lat: 41.3870, lng: 2.1130, premium: true },
      { name: 'Gràcia', postalCode: '08012', lat: 41.4040, lng: 2.1570, premium: false },
      { name: 'Barceloneta', postalCode: '08003', lat: 41.3810, lng: 2.1890, premium: false },
      { name: 'Poblenou', postalCode: '08005', lat: 41.4010, lng: 2.2070, premium: false },
      { name: 'El Born', postalCode: '08003', lat: 41.3860, lng: 2.1830, premium: false },
      { name: 'Poble Sec', postalCode: '08004', lat: 41.3730, lng: 2.1650, premium: false },
      { name: 'Sant Antoni', postalCode: '08015', lat: 41.3790, lng: 2.1600, premium: false },
      { name: 'Les Corts', postalCode: '08028', lat: 41.3830, lng: 2.1300, premium: false },
      { name: 'Nou Barris', postalCode: '08042', lat: 41.4400, lng: 2.1770, premium: false },
    ],
  },
  {
    name: 'Valencia',
    province: 'Valencia',
    lat: 39.4699,
    lng: -0.3763,
    basePriceSale: 2400,
    baseRent: 10,
    neighborhoods: [
      { name: 'Ciutat Vella', postalCode: '46001', lat: 39.4750, lng: -0.3760, premium: true },
      { name: 'Eixample', postalCode: '46005', lat: 39.4680, lng: -0.3690, premium: true },
      { name: 'Ruzafa', postalCode: '46006', lat: 39.4620, lng: -0.3700, premium: false },
      { name: 'El Carmen', postalCode: '46003', lat: 39.4780, lng: -0.3800, premium: false },
      { name: 'Benimaclet', postalCode: '46020', lat: 39.4890, lng: -0.3560, premium: false },
      { name: 'Campanar', postalCode: '46015', lat: 39.4820, lng: -0.3960, premium: false },
      { name: 'Poblats Marítims', postalCode: '46011', lat: 39.4570, lng: -0.3310, premium: false },
      { name: 'Patraix', postalCode: '46018', lat: 39.4600, lng: -0.3930, premium: false },
      { name: "L'Eliana", postalCode: '46183', lat: 39.5690, lng: -0.5260, premium: true },
      { name: 'Quatre Carreres', postalCode: '46013', lat: 39.4530, lng: -0.3580, premium: false },
    ],
  },
  {
    name: 'Sevilla',
    province: 'Sevilla',
    lat: 37.3891,
    lng: -5.9845,
    basePriceSale: 2200,
    baseRent: 9,
    neighborhoods: [
      { name: 'Santa Cruz', postalCode: '41004', lat: 37.3850, lng: -5.9870, premium: true },
      { name: 'Los Remedios', postalCode: '41011', lat: 37.3760, lng: -6.0030, premium: true },
      { name: 'Triana', postalCode: '41010', lat: 37.3830, lng: -6.0020, premium: false },
      { name: 'Nervión', postalCode: '41005', lat: 37.3870, lng: -5.9720, premium: false },
      { name: 'Macarena', postalCode: '41009', lat: 37.4010, lng: -5.9880, premium: false },
      { name: 'San Pablo', postalCode: '41007', lat: 37.4050, lng: -5.9730, premium: false },
      { name: 'Alameda', postalCode: '41002', lat: 37.3950, lng: -5.9920, premium: false },
      { name: 'Casco Antiguo', postalCode: '41001', lat: 37.3880, lng: -5.9960, premium: true },
    ],
  },
  {
    name: 'Málaga',
    province: 'Málaga',
    lat: 36.7213,
    lng: -4.4214,
    basePriceSale: 2800,
    baseRent: 11,
    neighborhoods: [
      { name: 'Centro Histórico', postalCode: '29015', lat: 36.7210, lng: -4.4200, premium: true },
      { name: 'Malagueta', postalCode: '29016', lat: 36.7180, lng: -4.4100, premium: true },
      { name: 'Pedregalejo', postalCode: '29017', lat: 36.7170, lng: -4.3900, premium: false },
      { name: 'El Palo', postalCode: '29018', lat: 36.7190, lng: -4.3690, premium: false },
      { name: 'Teatinos', postalCode: '29010', lat: 36.7260, lng: -4.4630, premium: false },
      { name: 'Huelin', postalCode: '29002', lat: 36.7100, lng: -4.4380, premium: false },
      { name: 'Carretera de Cádiz', postalCode: '29004', lat: 36.7050, lng: -4.4450, premium: false },
    ],
  },
  {
    name: 'Bilbao',
    province: 'Vizcaya',
    lat: 43.2630,
    lng: -2.9350,
    basePriceSale: 3200,
    baseRent: 12,
    neighborhoods: [
      { name: 'Abando', postalCode: '48009', lat: 43.2630, lng: -2.9340, premium: true },
      { name: 'Indautxu', postalCode: '48011', lat: 43.2610, lng: -2.9420, premium: true },
      { name: 'Casco Viejo', postalCode: '48005', lat: 43.2590, lng: -2.9230, premium: false },
      { name: 'Deusto', postalCode: '48014', lat: 43.2720, lng: -2.9490, premium: false },
      { name: 'San Ignacio', postalCode: '48012', lat: 43.2700, lng: -2.9590, premium: false },
      { name: 'Basurto', postalCode: '48013', lat: 43.2650, lng: -2.9560, premium: false },
    ],
  },
];

const PROPERTY_TYPES_SALE = [
  'apartment', 'house', 'penthouse', 'duplex', 'villa', 'chalet', 'townhouse', 'studio', 'loft',
] as const;

const PROPERTY_TYPES_RENT = [
  'apartment', 'studio', 'loft', 'penthouse', 'duplex',
] as const;

const ENERGY_RATINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const ORIENTATIONS = ['Norte', 'Sur', 'Este', 'Oeste', 'Noreste', 'Sureste', 'Suroeste', 'Noroeste'] as const;
const HEATING_TYPES = ['Central', 'Individual gas', 'Eléctrico', 'Aerotermia', 'Suelo radiante'] as const;

const SPANISH_FIRST_NAMES = [
  'María', 'Carmen', 'Ana', 'Laura', 'Isabel', 'Lucía', 'Elena', 'Marta', 'Sara', 'Paula',
  'Antonio', 'Manuel', 'José', 'Francisco', 'David', 'Juan', 'Carlos', 'Miguel', 'Pedro', 'Rafael',
  'Sofía', 'Rocío', 'Alba', 'Nuria', 'Cristina', 'Alejandro', 'Daniel', 'Pablo', 'Javier', 'Jorge',
];

const SPANISH_LAST_NAMES = [
  'García', 'Martínez', 'López', 'Sánchez', 'González', 'Rodríguez', 'Fernández', 'Pérez',
  'Gómez', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Díaz', 'Torres', 'Ruiz', 'Hernández',
  'Jiménez', 'Navarro', 'Vega', 'Molina', 'Serrano', 'Ortega', 'Delgado', 'Castro',
];

const randomName = () =>
  `${randomItem(SPANISH_FIRST_NAMES)} ${randomItem(SPANISH_LAST_NAMES)} ${randomItem(SPANISH_LAST_NAMES)}`;

const randomEmail = (name: string) =>
  slugify(name.split(' ').slice(0, 2).join('.')) + randomInt(1, 99) + '@' + randomItem(['gmail.com', 'hotmail.com', 'outlook.es', 'yahoo.es']);

const randomPhone = () => `+34 ${randomItem(['6', '7'])}${Array.from({ length: 8 }, () => randomInt(0, 9)).join('')}`;

const SAMPLE_IMPROVEMENTS = [
  {
    id: 'imp-1', category: 'renovation' as const, title: 'Reforma de cocina completa',
    description: 'La cocina muestra signos de antigüedad. Una reforma moderna aumentaría significativamente el valor.',
    estimatedCost: { min: 6000, max: 10000 }, potentialValueIncrease: 8, priority: 'high' as const,
    detectedFrom: 'Análisis de imagen - Cocina',
  },
  {
    id: 'imp-2', category: 'plumbing' as const, title: 'Actualización de baños',
    description: 'Los baños presentan elementos antiguos que podrían modernizarse.',
    estimatedCost: { min: 3500, max: 5500 }, potentialValueIncrease: 5, priority: 'medium' as const,
    detectedFrom: 'Análisis de imagen - Baño',
  },
  {
    id: 'imp-3', category: 'painting' as const, title: 'Pintura integral',
    description: 'Se detectan paredes con necesidad de repintado para mejorar la presentación.',
    estimatedCost: { min: 1500, max: 2500 }, potentialValueIncrease: 3, priority: 'low' as const,
    detectedFrom: 'Análisis general de imágenes',
  },
  {
    id: 'imp-4', category: 'renovation' as const, title: 'Cambio de suelos',
    description: 'Los suelos actuales podrían reemplazarse por parquet o tarima flotante moderna.',
    estimatedCost: { min: 4500, max: 7000 }, potentialValueIncrease: 6, priority: 'medium' as const,
    detectedFrom: 'Análisis de imagen - Salón',
  },
  {
    id: 'imp-5', category: 'general' as const, title: 'Mejora de ventanas',
    description: 'Ventanas antiguas detectadas. Cambio a doble acristalamiento mejora eficiencia energética.',
    estimatedCost: { min: 4000, max: 6000 }, potentialValueIncrease: 4, priority: 'high' as const,
    detectedFrom: 'Análisis de certificación energética',
  },
  {
    id: 'imp-6', category: 'electrical' as const, title: 'Actualización instalación eléctrica',
    description: 'Instalación eléctrica antigua detectada. Necesita actualización a normativa vigente.',
    estimatedCost: { min: 3000, max: 5000 }, potentialValueIncrease: 2, priority: 'high' as const,
    detectedFrom: 'Análisis de certificación',
  },
  {
    id: 'imp-7', category: 'garden' as const, title: 'Paisajismo y jardinería',
    description: 'El jardín podría beneficiarse de un diseño paisajístico profesional.',
    estimatedCost: { min: 2000, max: 4000 }, potentialValueIncrease: 5, priority: 'low' as const,
    detectedFrom: 'Análisis de imagen - Exterior',
  },
];

// ============================================
// SOURCES DATA
// ============================================

const SOURCES_DATA = [
  { name: 'InmoAI', slug: 'inmoai', baseUrl: 'https://www.inmoai.es', website: 'https://www.inmoai.es', scrapingEnabled: false },
  { name: 'Usuario', slug: 'usuario', baseUrl: 'https://www.inmoai.es', website: 'https://www.inmoai.es', scrapingEnabled: false },
  { name: 'API', slug: 'api', baseUrl: 'https://api.inmoai.es', website: 'https://www.inmoai.es', scrapingEnabled: false },
  { name: 'CRM Import', slug: 'crm-import', baseUrl: 'https://www.inmoai.es', website: 'https://www.inmoai.es', scrapingEnabled: false },
  { name: 'Idealista', slug: 'idealista', baseUrl: 'https://www.idealista.com', website: 'https://www.idealista.com', scrapingEnabled: true, scrapingIntervalHours: 12 },
  { name: 'Fotocasa', slug: 'fotocasa', baseUrl: 'https://www.fotocasa.es', website: 'https://www.fotocasa.es', scrapingEnabled: true, scrapingIntervalHours: 24 },
  { name: 'Habitaclia', slug: 'habitaclia', baseUrl: 'https://www.habitaclia.com', website: 'https://www.habitaclia.com', scrapingEnabled: true, scrapingIntervalHours: 24 },
  { name: 'Pisos.com', slug: 'pisos-com', baseUrl: 'https://www.pisos.com', website: 'https://www.pisos.com', scrapingEnabled: true, scrapingIntervalHours: 48 },
];

// ============================================
// USERS DATA
// ============================================

const USERS_DATA = [
  { email: 'admin@inmoai.es', name: 'Admin InmoAI', role: 'admin' as const, hashedPassword: '$2a$10$placeholder' },
  { email: 'maria.garcia@gmail.com', name: 'María García López', role: 'premium' as const },
  { email: 'carlos.martinez@hotmail.com', name: 'Carlos Martínez Ruiz', role: 'premium' as const },
  { email: 'ana.lopez@yahoo.es', name: 'Ana López Fernández', role: 'user' as const },
  { email: 'juan.sanchez@outlook.es', name: 'Juan Sánchez Moreno', role: 'user' as const },
  { email: 'laura.fernandez@gmail.com', name: 'Laura Fernández Torres', role: 'user' as const },
  { email: 'pedro.gonzalez@gmail.com', name: 'Pedro González Díaz', role: 'user' as const },
  { email: 'sofia.rodriguez@hotmail.com', name: 'Sofía Rodríguez Muñoz', role: 'user' as const },
  { email: 'david.perez@gmail.com', name: 'David Pérez Álvarez', role: 'premium' as const },
  { email: 'remax.madrid@remax.es', name: 'RE/MAX Madrid Centro', role: 'agency' as const, agencyName: 'RE/MAX Madrid Centro', agencyPhone: '+34 912345678' },
  { email: 'tecnocasa.bcn@tecnocasa.es', name: 'Tecnocasa Barcelona', role: 'agency' as const, agencyName: 'Tecnocasa Barcelona Eixample', agencyPhone: '+34 934567890' },
  { email: 'century21.vlc@c21.es', name: 'Century 21 Valencia', role: 'agency' as const, agencyName: 'Century 21 Valencia', agencyPhone: '+34 963456789' },
  { email: 'keller.sevilla@kw.es', name: 'Keller Williams Sevilla', role: 'agency' as const, agencyName: 'Keller Williams Sevilla', agencyPhone: '+34 954567890' },
  { email: 'elena.navarro@gmail.com', name: 'Elena Navarro Serrano', role: 'user' as const },
  { email: 'miguel.romero@outlook.es', name: 'Miguel Romero Vega', role: 'premium' as const },
  { email: 'cristina.diaz@gmail.com', name: 'Cristina Díaz Ortega', role: 'user' as const },
  { email: 'alejandro.molina@gmail.com', name: 'Alejandro Molina Castro', role: 'user' as const },
  { email: 'nuria.torres@yahoo.es', name: 'Nuria Torres Delgado', role: 'user' as const },
  { email: 'inversiones.bcn@inversion.es', name: 'Inversiones BCN SL', role: 'agency' as const, agencyName: 'Inversiones BCN', agencyPhone: '+34 935678901' },
  { email: 'pablo.ruiz@gmail.com', name: 'Pablo Ruiz Hernández', role: 'user' as const },
];

// ============================================
// LISTING GENERATOR
// ============================================

interface ListingTemplate {
  title: string;
  description: string;
  propertyType: string;
  operationType: 'sale' | 'rent';
  city: CityData;
  neighborhood: (typeof CITIES)[0]['neighborhoods'][0];
  sourceSlug: string;
  daysOnMarket: number;
}

function generateListingPrice(template: ListingTemplate): number {
  const { city, neighborhood, propertyType, operationType } = template;
  const sizeSqm = getSizeForType(propertyType);
  const premiumMultiplier = neighborhood.premium ? 1.35 : 1.0;
  const typeMultiplier = getTypeMultiplier(propertyType);

  if (operationType === 'rent') {
    return Math.round(sizeSqm * city.baseRent * premiumMultiplier * typeMultiplier);
  }
  return Math.round(sizeSqm * city.basePriceSale * premiumMultiplier * typeMultiplier);
}

function getSizeForType(type: string): number {
  const sizes: Record<string, [number, number]> = {
    studio: [25, 50], apartment: [50, 130], penthouse: [80, 180],
    duplex: [90, 200], house: [120, 300], villa: [200, 500],
    chalet: [150, 400], townhouse: [100, 220], loft: [60, 130],
    land: [200, 2000], commercial: [50, 500], office: [30, 200],
    garage: [12, 30], storage: [5, 30],
  };
  const [min, max] = sizes[type] ?? [60, 120];
  return randomInt(min, max);
}

function getTypeMultiplier(type: string): number {
  const multipliers: Record<string, number> = {
    studio: 0.9, apartment: 1.0, penthouse: 1.4, duplex: 1.15,
    house: 0.85, villa: 1.3, chalet: 1.1, townhouse: 0.95,
    loft: 1.1, land: 0.3, commercial: 1.2, office: 1.1,
    garage: 3.0, storage: 2.0,
  };
  return multipliers[type] ?? 1.0;
}

function getRoomsForType(type: string, size: number): { rooms: number; bedrooms: number; bathrooms: number } {
  if (type === 'studio') return { rooms: 1, bedrooms: 1, bathrooms: 1 };
  if (type === 'garage' || type === 'storage' || type === 'land') return { rooms: 0, bedrooms: 0, bathrooms: 0 };

  const bedrooms = Math.max(1, Math.min(6, Math.floor(size / 30)));
  const bathrooms = Math.max(1, Math.ceil(bedrooms / 2));
  const rooms = bedrooms + randomInt(1, 2);
  return { rooms, bedrooms, bathrooms };
}

function generatePriceHistory(currentPrice: number, daysOnMarket: number): number[] {
  if (daysOnMarket < 30) return [currentPrice];
  const drops = Math.min(Math.floor(daysOnMarket / 45), 4);
  const prices: number[] = [currentPrice];
  let price = currentPrice;
  for (let i = 0; i < drops; i++) {
    price = Math.round(price * (1 + randomDec(0.02, 0.08)));
    prices.unshift(price);
  }
  return prices;
}

// Sale description templates
const SALE_DESCRIPTIONS: Record<string, string[]> = {
  apartment: [
    'Amplio piso totalmente reformado con acabados de alta calidad. Luminoso y exterior con excelentes comunicaciones.',
    'Piso en perfecto estado de conservación en finca bien mantenida. Zona tranquila y residencial.',
    'Bonito piso con distribución funcional y materiales de primera. Ideal para familias o inversión.',
    'Piso moderno y funcional en edificio con portero físico. Excelente relación calidad-precio.',
    'Magnífico piso con vistas despejadas y orientación sur. Muy luminoso todo el día.',
  ],
  penthouse: [
    'Espectacular ático con amplias terrazas y vistas panorámicas. Completamente reformado con diseño contemporáneo.',
    'Ático de lujo con solarium privado y acabados premium. Una oportunidad única en esta zona.',
  ],
  duplex: [
    'Precioso dúplex con distribución en dos plantas. Planta baja salón-cocina, planta alta zona de noche.',
    'Amplio dúplex con terraza y parking incluido. Ideal para familias que buscan espacio.',
  ],
  villa: [
    'Impresionante villa con jardín privado y piscina. Máxima privacidad en entorno residencial.',
    'Villa de diseño con amplios espacios y luz natural. Materiales nobles y acabados de lujo.',
  ],
  house: [
    'Casa independiente con terreno y posibilidad de ampliación. Zona residencial consolidada.',
    'Bonita casa con carácter y encanto. Reformada manteniendo elementos originales de valor.',
  ],
  studio: [
    'Moderno estudio perfecto para inversión o primera vivienda. Muy bien comunicado.',
    'Acogedor estudio con aprovechamiento óptimo del espacio. Cocina americana equipada.',
  ],
  loft: [
    'Espectacular loft industrial completamente reformado. Techos altos y espacios diáfanos.',
    'Loft de diseño en antigua nave rehabilitada. Ambiente único y mucha personalidad.',
  ],
  chalet: [
    'Fantástico chalet con jardín, piscina y garaje. Urbanización con vigilancia 24h.',
    'Chalet independiente en parcela amplia. Acabados de calidad y mucho potencial.',
  ],
  townhouse: [
    'Adosado moderno con jardín privado y piscina comunitaria. Zona residencial tranquila.',
    'Casa adosada en urbanización con zonas comunes. Perfecto para familias.',
  ],
};

const RENT_DESCRIPTIONS = [
  'Apartamento totalmente amueblado y equipado, listo para entrar a vivir. Zona excelente.',
  'Piso en alquiler en zona premium. Incluye electrodomésticos y aire acondicionado.',
  'Vivienda luminosa y bien distribuida disponible para alquiler de larga duración.',
  'Bonito piso amueblado con cocina totalmente equipada. Gastos de comunidad incluidos.',
  'Apartamento moderno con acabados de calidad. Cerca de transporte y servicios.',
];

function generateAllListings(): ListingTemplate[] {
  const templates: ListingTemplate[] = [];
  const sourceOptions = ['inmoai', 'usuario', 'api', 'crm-import', 'idealista', 'fotocasa', 'habitaclia', 'pisos-com'];

  // Generate listings per city
  for (const city of CITIES) {
    // Proportional to city importance
    const saleCount = city.name === 'Madrid' ? 30 : city.name === 'Barcelona' ? 25 : city.name === 'Valencia' ? 20 : 15;
    const rentCount = city.name === 'Madrid' ? 12 : city.name === 'Barcelona' ? 10 : city.name === 'Valencia' ? 8 : 5;

    // Sale listings
    for (let i = 0; i < saleCount; i++) {
      const neighborhood = randomItem(city.neighborhoods);
      const propertyType = randomItem(PROPERTY_TYPES_SALE);
      const descriptions = SALE_DESCRIPTIONS[propertyType] ?? SALE_DESCRIPTIONS['apartment'];

      templates.push({
        title: generateSaleTitle(propertyType, neighborhood.name, city.name),
        description: randomItem(descriptions),
        propertyType,
        operationType: 'sale',
        city,
        neighborhood,
        sourceSlug: randomItem(sourceOptions),
        daysOnMarket: randomItem([2, 5, 10, 15, 25, 35, 50, 75, 100, 140, 200]),
      });
    }

    // Rent listings
    for (let i = 0; i < rentCount; i++) {
      const neighborhood = randomItem(city.neighborhoods);
      const propertyType = randomItem(PROPERTY_TYPES_RENT);

      templates.push({
        title: generateRentTitle(propertyType, neighborhood.name),
        description: randomItem(RENT_DESCRIPTIONS),
        propertyType,
        operationType: 'rent',
        city,
        neighborhood,
        sourceSlug: randomItem(sourceOptions),
        daysOnMarket: randomItem([1, 3, 7, 14, 21, 30, 45]),
      });
    }
  }

  return templates;
}

function generateSaleTitle(type: string, neighborhood: string, city: string): string {
  const titles: Record<string, string[]> = {
    apartment: ['Piso', 'Piso reformado', 'Piso luminoso', 'Piso amplio', 'Piso exterior'],
    penthouse: ['Ático', 'Ático con terraza', 'Ático de lujo', 'Ático panorámico'],
    duplex: ['Dúplex', 'Dúplex con terraza', 'Dúplex moderno'],
    villa: ['Villa', 'Villa de lujo', 'Villa con piscina'],
    house: ['Casa', 'Casa independiente', 'Casa con jardín'],
    studio: ['Estudio', 'Estudio moderno', 'Estudio céntrico'],
    loft: ['Loft', 'Loft industrial', 'Loft de diseño'],
    chalet: ['Chalet', 'Chalet independiente', 'Chalet con piscina'],
    townhouse: ['Adosado', 'Casa adosada', 'Adosado moderno'],
  };
  const prefix = randomItem(titles[type] ?? ['Propiedad']);
  return `${prefix} en ${neighborhood}`;
}

function generateRentTitle(type: string, neighborhood: string): string {
  const titles: Record<string, string[]> = {
    apartment: ['Piso en alquiler', 'Apartamento amueblado', 'Piso equipado'],
    studio: ['Estudio en alquiler', 'Estudio amueblado'],
    loft: ['Loft en alquiler', 'Loft amueblado'],
    penthouse: ['Ático en alquiler', 'Ático amueblado'],
    duplex: ['Dúplex en alquiler'],
  };
  const prefix = randomItem(titles[type] ?? ['Vivienda en alquiler']);
  return `${prefix} en ${neighborhood}`;
}

// ============================================
// SERVICE PROVIDERS DATA
// ============================================

interface ProviderData {
  businessName: string;
  description: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  services: { category: string; title: string; priceMin: number; priceMax: number; priceUnit: string }[];
  tier: 'free' | 'premium' | 'enterprise';
  isVerified: boolean;
  yearsInBusiness: number;
}

const PROVIDERS_DATA: ProviderData[] = [
  // Madrid providers
  { businessName: 'Reformas Integrales Madrid SL', description: 'Empresa especializada en reformas integrales de viviendas y locales comerciales en Madrid y alrededores.', city: 'Madrid', province: 'Madrid', lat: 40.4230, lng: -3.7110, tier: 'premium', isVerified: true, yearsInBusiness: 15,
    services: [
      { category: 'renovation', title: 'Reforma integral vivienda', priceMin: 15000, priceMax: 60000, priceUnit: 'proyecto' },
      { category: 'renovation', title: 'Reforma parcial cocina/baño', priceMin: 5000, priceMax: 15000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Pinturas López y Hermanos', description: 'Pintores profesionales con más de 20 años de experiencia. Trabajos de interior y exterior.', city: 'Madrid', province: 'Madrid', lat: 40.4150, lng: -3.7050, tier: 'free', isVerified: true, yearsInBusiness: 22,
    services: [
      { category: 'painting', title: 'Pintura interior vivienda', priceMin: 800, priceMax: 3000, priceUnit: 'proyecto' },
      { category: 'painting', title: 'Pintura exterior fachada', priceMin: 2000, priceMax: 8000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'ElectroHogar Madrid', description: 'Instalaciones eléctricas, domótica y certificados de instalación. Servicio rápido y profesional.', city: 'Madrid', province: 'Madrid', lat: 40.4280, lng: -3.6950, tier: 'premium', isVerified: true, yearsInBusiness: 10,
    services: [
      { category: 'electrical', title: 'Instalación eléctrica completa', priceMin: 3000, priceMax: 8000, priceUnit: 'proyecto' },
      { category: 'electrical', title: 'Boletín eléctrico', priceMin: 150, priceMax: 300, priceUnit: 'servicio' },
    ] },
  { businessName: 'Fontanería Express Madrid', description: 'Servicio de fontanería urgente 24h. Reparaciones, instalaciones y desatascos.', city: 'Madrid', province: 'Madrid', lat: 40.4090, lng: -3.7200, tier: 'free', isVerified: false, yearsInBusiness: 8,
    services: [
      { category: 'plumbing', title: 'Reparación urgente fontanería', priceMin: 80, priceMax: 300, priceUnit: 'servicio' },
      { category: 'plumbing', title: 'Instalación baño completo', priceMin: 2000, priceMax: 5000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Jardines del Manzanares', description: 'Diseño, creación y mantenimiento de jardines y terrazas. Paisajismo profesional.', city: 'Madrid', province: 'Madrid', lat: 40.3950, lng: -3.7300, tier: 'premium', isVerified: true, yearsInBusiness: 12,
    services: [
      { category: 'garden', title: 'Diseño paisajístico', priceMin: 1500, priceMax: 5000, priceUnit: 'proyecto' },
      { category: 'garden', title: 'Mantenimiento mensual jardín', priceMin: 150, priceMax: 400, priceUnit: 'mes' },
    ] },
  // Barcelona providers
  { businessName: 'Reformes Barcelona 360', description: 'Reformas y rehabilitación de edificios en Barcelona. Especialistas en modernismo.', city: 'Barcelona', province: 'Barcelona', lat: 41.3920, lng: 2.1650, tier: 'enterprise', isVerified: true, yearsInBusiness: 18,
    services: [
      { category: 'renovation', title: 'Reforma integral piso', priceMin: 20000, priceMax: 80000, priceUnit: 'proyecto' },
      { category: 'general', title: 'Rehabilitación fachada', priceMin: 10000, priceMax: 40000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Pintures Catalanes', description: 'Empresa de pintura decorativa y restauración. Expertos en esgrafiados y técnicas especiales.', city: 'Barcelona', province: 'Barcelona', lat: 41.3870, lng: 2.1580, tier: 'free', isVerified: true, yearsInBusiness: 9,
    services: [
      { category: 'painting', title: 'Pintura decorativa', priceMin: 1200, priceMax: 4000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Elèctrica Diagonal', description: 'Instalaciones eléctricas industriales y domésticas. Energía solar y domótica.', city: 'Barcelona', province: 'Barcelona', lat: 41.3950, lng: 2.1700, tier: 'premium', isVerified: true, yearsInBusiness: 14,
    services: [
      { category: 'electrical', title: 'Instalación solar fotovoltaica', priceMin: 5000, priceMax: 15000, priceUnit: 'proyecto' },
      { category: 'electrical', title: 'Domótica hogar', priceMin: 2000, priceMax: 8000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Lampisteria BCN', description: 'Fontanería integral en Barcelona. Calefacción, gas y reparaciones urgentes.', city: 'Barcelona', province: 'Barcelona', lat: 41.3830, lng: 2.1530, tier: 'free', isVerified: false, yearsInBusiness: 6,
    services: [
      { category: 'plumbing', title: 'Instalación calefacción', priceMin: 3000, priceMax: 10000, priceUnit: 'proyecto' },
    ] },
  // Valencia providers
  { businessName: 'Reformas Mediterráneas', description: 'Reformas integrales en Valencia y provincia. Estilo mediterráneo moderno.', city: 'Valencia', province: 'Valencia', lat: 39.4720, lng: -0.3750, tier: 'premium', isVerified: true, yearsInBusiness: 11,
    services: [
      { category: 'renovation', title: 'Reforma integral', priceMin: 12000, priceMax: 45000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Pinturas del Turia', description: 'Pintura profesional en Valencia. Impermeabilización y tratamiento de humedades.', city: 'Valencia', province: 'Valencia', lat: 39.4680, lng: -0.3810, tier: 'free', isVerified: true, yearsInBusiness: 7,
    services: [
      { category: 'painting', title: 'Pintura e impermeabilización', priceMin: 1000, priceMax: 3500, priceUnit: 'proyecto' },
    ] },
  { businessName: 'ElectroVal Instalaciones', description: 'Electricistas cualificados en Valencia. Certificados eléctricos y reformas.', city: 'Valencia', province: 'Valencia', lat: 39.4760, lng: -0.3700, tier: 'free', isVerified: true, yearsInBusiness: 5,
    services: [
      { category: 'electrical', title: 'Reforma instalación eléctrica', priceMin: 2500, priceMax: 6000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Jardins de la Horta', description: 'Jardinería y paisajismo en Valencia. Diseño de jardines mediterráneos.', city: 'Valencia', province: 'Valencia', lat: 39.4650, lng: -0.3680, tier: 'premium', isVerified: true, yearsInBusiness: 9,
    services: [
      { category: 'garden', title: 'Diseño jardín mediterráneo', priceMin: 1000, priceMax: 4000, priceUnit: 'proyecto' },
      { category: 'garden', title: 'Piscina e instalación', priceMin: 8000, priceMax: 25000, priceUnit: 'proyecto' },
    ] },
  // Sevilla providers
  { businessName: 'Reformas Giralda SL', description: 'Reformas y rehabilitación en Sevilla. Especialistas en viviendas del casco histórico.', city: 'Sevilla', province: 'Sevilla', lat: 37.3880, lng: -5.9870, tier: 'premium', isVerified: true, yearsInBusiness: 20,
    services: [
      { category: 'renovation', title: 'Rehabilitación vivienda casco antiguo', priceMin: 18000, priceMax: 55000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Pinturas Triana', description: 'Pintores en Sevilla con más de 15 años. Trabajos de calidad garantizada.', city: 'Sevilla', province: 'Sevilla', lat: 37.3820, lng: -6.0010, tier: 'free', isVerified: false, yearsInBusiness: 16,
    services: [
      { category: 'painting', title: 'Pintura vivienda completa', priceMin: 700, priceMax: 2500, priceUnit: 'proyecto' },
    ] },
  // Málaga providers
  { businessName: 'Costa Reformas Málaga', description: 'Reformas integrales en Málaga y Costa del Sol. Viviendas y locales comerciales.', city: 'Málaga', province: 'Málaga', lat: 36.7220, lng: -4.4230, tier: 'premium', isVerified: true, yearsInBusiness: 13,
    services: [
      { category: 'renovation', title: 'Reforma vivienda Costa del Sol', priceMin: 14000, priceMax: 50000, priceUnit: 'proyecto' },
      { category: 'general', title: 'Adaptación vivienda vacacional', priceMin: 5000, priceMax: 15000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Piscinas Mediterráneo', description: 'Construcción e instalación de piscinas en Málaga. Mantenimiento integral.', city: 'Málaga', province: 'Málaga', lat: 36.7180, lng: -4.4150, tier: 'free', isVerified: true, yearsInBusiness: 8,
    services: [
      { category: 'garden', title: 'Construcción piscina', priceMin: 10000, priceMax: 30000, priceUnit: 'proyecto' },
      { category: 'garden', title: 'Mantenimiento piscina', priceMin: 80, priceMax: 200, priceUnit: 'mes' },
    ] },
  // Bilbao providers
  { businessName: 'Erreformas Bilbao', description: 'Reformas integrales en Bilbao y Bizkaia. Rehabilitación de edificios.', city: 'Bilbao', province: 'Vizcaya', lat: 43.2640, lng: -2.9360, tier: 'premium', isVerified: true, yearsInBusiness: 17,
    services: [
      { category: 'renovation', title: 'Reforma integral vivienda', priceMin: 16000, priceMax: 55000, priceUnit: 'proyecto' },
    ] },
  { businessName: 'Pintura Profesional Euskadi', description: 'Pintores profesionales en País Vasco. Trabajos industriales y residenciales.', city: 'Bilbao', province: 'Vizcaya', lat: 43.2600, lng: -2.9400, tier: 'free', isVerified: true, yearsInBusiness: 10,
    services: [
      { category: 'painting', title: 'Pintura residencial', priceMin: 900, priceMax: 3200, priceUnit: 'proyecto' },
    ] },
  // Multi-city providers
  { businessName: 'HomeServe España', description: 'Servicio de reparaciones y mantenimiento del hogar a nivel nacional. Multimarca.', city: 'Madrid', province: 'Madrid', lat: 40.4200, lng: -3.7000, tier: 'enterprise', isVerified: true, yearsInBusiness: 25,
    services: [
      { category: 'plumbing', title: 'Reparación fontanería urgente', priceMin: 60, priceMax: 200, priceUnit: 'servicio' },
      { category: 'electrical', title: 'Reparación eléctrica', priceMin: 60, priceMax: 200, priceUnit: 'servicio' },
      { category: 'general', title: 'Mantenimiento hogar anual', priceMin: 200, priceMax: 500, priceUnit: 'año' },
    ] },
  { businessName: 'Leroy Merlin Reformas', description: 'Servicio de reformas profesional con garantía Leroy Merlin. Materiales incluidos.', city: 'Madrid', province: 'Madrid', lat: 40.4100, lng: -3.6900, tier: 'enterprise', isVerified: true, yearsInBusiness: 30,
    services: [
      { category: 'renovation', title: 'Reforma cocina llave en mano', priceMin: 8000, priceMax: 20000, priceUnit: 'proyecto' },
      { category: 'renovation', title: 'Reforma baño llave en mano', priceMin: 4000, priceMax: 12000, priceUnit: 'proyecto' },
      { category: 'painting', title: 'Pintura profesional', priceMin: 600, priceMax: 2500, priceUnit: 'proyecto' },
    ] },
];

// ============================================
// BUSINESS DIRECTORY DATA
// ============================================

interface BusinessData {
  name: string;
  category: string;
  city: string;
  province: string;
  description: string;
  shortDescription: string;
  specializations: string[];
  tier: 'free' | 'featured' | 'premium';
  isVerified: boolean;
}

const BUSINESSES_DATA: BusinessData[] = [
  // Notaries
  { name: 'Notaría Martínez-Sáenz', category: 'notary', city: 'Madrid', province: 'Madrid', description: 'Notaría con más de 30 años en operaciones inmobiliarias. Especialistas en compraventa, hipotecas y herencias.', shortDescription: 'Notaría especializada en inmobiliario en Madrid', specializations: ['compraventa', 'hipotecas', 'herencias', 'societario'], tier: 'premium', isVerified: true },
  { name: 'Notaría García-Fernández', category: 'notary', city: 'Barcelona', province: 'Barcelona', description: 'Notaría de referencia en Barcelona para operaciones inmobiliarias complejas.', shortDescription: 'Notaría en Barcelona, operaciones inmobiliarias', specializations: ['compraventa', 'obra nueva', 'propiedad horizontal'], tier: 'featured', isVerified: true },
  { name: 'Notaría López Navarro', category: 'notary', city: 'Valencia', province: 'Valencia', description: 'Notaría en Valencia especializada en derecho inmobiliario y mercantil.', shortDescription: 'Notaría en Valencia, derecho inmobiliario', specializations: ['compraventa', 'testamentos', 'poderes'], tier: 'free', isVerified: true },
  { name: 'Notaría Sevilla Centro', category: 'notary', city: 'Sevilla', province: 'Sevilla', description: 'Notaría céntrica en Sevilla con atención personalizada en transacciones inmobiliarias.', shortDescription: 'Notaría céntrica en Sevilla', specializations: ['compraventa', 'donaciones', 'hipotecas'], tier: 'featured', isVerified: true },
  // Gestorías
  { name: 'Gestoría Integral Madrid', category: 'gestoria', city: 'Madrid', province: 'Madrid', description: 'Gestoría administrativa especializada en trámites inmobiliarios: ITP, plusvalía, cambios de titularidad, IBI.', shortDescription: 'Gestoría inmobiliaria en Madrid', specializations: ['ITP', 'plusvalía', 'IBI', 'registro propiedad', 'NIE'], tier: 'premium', isVerified: true },
  { name: 'Gestoria BCN Tramits', category: 'gestoria', city: 'Barcelona', province: 'Barcelona', description: 'Gestoría en Barcelona para todos los trámites de compraventa inmobiliaria. Atención en catalán y castellano.', shortDescription: 'Gestoría inmobiliaria Barcelona', specializations: ['ITP', 'plusvalía', 'licencias', 'cédula habitabilidad'], tier: 'featured', isVerified: true },
  { name: 'Gestoría Mediterránea', category: 'gestoria', city: 'Valencia', province: 'Valencia', description: 'Gestoría administrativa en Valencia. Tramitación integral de operaciones inmobiliarias.', shortDescription: 'Gestoría en Valencia', specializations: ['ITP', 'NIE', 'registro', 'certificados energéticos'], tier: 'free', isVerified: false },
  { name: 'Gestoría Guadalquivir', category: 'gestoria', city: 'Sevilla', province: 'Sevilla', description: 'Gestoría profesional en Sevilla especializada en impuestos inmobiliarios y trámites registrales.', shortDescription: 'Gestoría en Sevilla, impuestos inmobiliarios', specializations: ['ITP', 'IIVTNU', 'registro', 'herencias'], tier: 'free', isVerified: true },
  // Lawyers
  { name: 'Despacho Jurídico Inmobiliario DJI', category: 'lawyer', city: 'Madrid', province: 'Madrid', description: 'Abogados especializados en derecho inmobiliario, urbanismo y construcción. Resolución de conflictos.', shortDescription: 'Abogados inmobiliarios en Madrid', specializations: ['compraventa', 'arrendamientos', 'urbanismo', 'vicios ocultos', 'comunidades'], tier: 'premium', isVerified: true },
  { name: 'Bufete Arrendamientos BCN', category: 'lawyer', city: 'Barcelona', province: 'Barcelona', description: 'Especialistas en derecho de arrendamientos urbanos. Desahucios, LAU, y defensa de propietarios.', shortDescription: 'Abogados de arrendamientos en Barcelona', specializations: ['arrendamientos', 'desahucios', 'LAU', 'cláusulas abusivas'], tier: 'featured', isVerified: true },
  { name: 'Abogados Costa Blanca', category: 'lawyer', city: 'Valencia', province: 'Valencia', description: 'Despacho especializado en compraventa internacional y golden visa inmobiliaria.', shortDescription: 'Abogados compraventa internacional Valencia', specializations: ['compraventa internacional', 'golden visa', 'NIE', 'fiscal no residente'], tier: 'premium', isVerified: true },
  { name: 'Bufete Andaluz de Vivienda', category: 'lawyer', city: 'Sevilla', province: 'Sevilla', description: 'Abogados especializados en reclamaciones de vivienda, cláusulas suelo y gastos hipotecarios.', shortDescription: 'Abogados reclamaciones vivienda Sevilla', specializations: ['reclamaciones hipotecarias', 'vicios ocultos', 'comunidades', 'arrendamientos'], tier: 'free', isVerified: true },
  // Renovation companies
  { name: 'Grupo Construhogar', category: 'renovation', city: 'Madrid', province: 'Madrid', description: 'Empresa constructora y de reformas con más de 20 años de experiencia en Madrid y área metropolitana.', shortDescription: 'Reformas integrales Madrid', specializations: ['reforma integral', 'obra nueva', 'rehabilitación', 'certificación energética'], tier: 'premium', isVerified: true },
  { name: 'Rehabilitacions Catalunya', category: 'renovation', city: 'Barcelona', province: 'Barcelona', description: 'Empresa de rehabilitación de edificios y reformas en Barcelona. Especialistas en modernismo.', shortDescription: 'Rehabilitación edificios Barcelona', specializations: ['rehabilitación', 'ITE', 'accesibilidad', 'eficiencia energética'], tier: 'featured', isVerified: true },
  // Moving companies
  { name: 'Mudanzas Gil España', category: 'moving', city: 'Madrid', province: 'Madrid', description: 'Empresa de mudanzas nacionales e internacionales. Embalaje, transporte y montaje incluidos.', shortDescription: 'Mudanzas nacionales e internacionales', specializations: ['mudanzas nacionales', 'mudanzas internacionales', 'guardamuebles', 'embalaje'], tier: 'featured', isVerified: true },
  { name: 'Transportes Mudanzas BCN', category: 'moving', city: 'Barcelona', province: 'Barcelona', description: 'Mudanzas económicas en Barcelona y Cataluña. Servicio rápido y profesional.', shortDescription: 'Mudanzas económicas Barcelona', specializations: ['mudanzas locales', 'elevador exterior', 'montaje muebles'], tier: 'free', isVerified: false },
  { name: 'Mudanzas Express Levante', category: 'moving', city: 'Valencia', province: 'Valencia', description: 'Mudanzas en Valencia y Levante. Precio cerrado sin sorpresas.', shortDescription: 'Mudanzas Valencia precio cerrado', specializations: ['mudanzas locales', 'guardamuebles', 'desmontaje'], tier: 'free', isVerified: true },
  // Cleaning companies
  { name: 'Limpieza Profesional Capital', category: 'cleaning', city: 'Madrid', province: 'Madrid', description: 'Limpieza profesional de pisos y locales. Servicio de limpieza de fin de obra y entrada/salida inquilinos.', shortDescription: 'Limpieza profesional de pisos Madrid', specializations: ['limpieza fin obra', 'limpieza pisos', 'desinfección', 'cristales'], tier: 'free', isVerified: true },
  { name: 'NetCasa Barcelona', category: 'cleaning', city: 'Barcelona', province: 'Barcelona', description: 'Servicio de limpieza integral en Barcelona. Especializados en viviendas turísticas y Airbnb.', shortDescription: 'Limpieza pisos turísticos Barcelona', specializations: ['limpieza turístico', 'Airbnb', 'limpieza profunda', 'lavandería'], tier: 'featured', isVerified: true },
  // Insurance brokers
  { name: 'Seguros Hogar 360', category: 'insurance', city: 'Madrid', province: 'Madrid', description: 'Correduría de seguros especializada en hogar, comunidades y responsabilidad civil inmobiliaria.', shortDescription: 'Seguros hogar y comunidades Madrid', specializations: ['seguro hogar', 'comunidades', 'responsabilidad civil', 'impagos alquiler'], tier: 'premium', isVerified: true },
  { name: 'Assegurances Habitat', category: 'insurance', city: 'Barcelona', province: 'Barcelona', description: 'Seguros para el sector inmobiliario en Cataluña. Multicompañía con las mejores coberturas.', shortDescription: 'Seguros inmobiliarios Cataluña', specializations: ['seguro hogar', 'impagos', 'decenal', 'RC promotor'], tier: 'featured', isVerified: true },
  // Appraisers
  { name: 'Tasaciones Madrid Centro', category: 'appraisal', city: 'Madrid', province: 'Madrid', description: 'Sociedad de tasación homologada por Banco de España. Tasaciones oficiales para hipotecas y herencias.', shortDescription: 'Tasaciones oficiales Madrid', specializations: ['tasación hipotecaria', 'tasación herencia', 'valoración patrimonial', 'IBI'], tier: 'premium', isVerified: true },
  { name: 'Valoraciones Catalanas', category: 'appraisal', city: 'Barcelona', province: 'Barcelona', description: 'Tasaciones y valoraciones inmobiliarias en Cataluña. Homologados por Banco de España.', shortDescription: 'Tasaciones oficiales Barcelona', specializations: ['tasación hipotecaria', 'peritaje judicial', 'valoración suelo'], tier: 'featured', isVerified: true },
  // Mortgage brokers
  { name: 'Hipotecas Online España', category: 'mortgage_broker', city: 'Madrid', province: 'Madrid', description: 'Broker hipotecario online. Comparamos entre más de 20 bancos para encontrar tu mejor hipoteca.', shortDescription: 'Broker hipotecario online nacional', specializations: ['hipoteca fija', 'hipoteca variable', 'hipoteca mixta', 'subrogación', 'no residente'], tier: 'premium', isVerified: true },
  { name: 'FinanHogar Barcelona', category: 'mortgage_broker', city: 'Barcelona', province: 'Barcelona', description: 'Intermediarios financieros especializados en financiación inmobiliaria en Cataluña.', shortDescription: 'Financiación inmobiliaria Barcelona', specializations: ['hipoteca', 'autopromoción', 'segunda vivienda', 'inversión'], tier: 'featured', isVerified: true },
  { name: 'HipotecaFácil Valencia', category: 'mortgage_broker', city: 'Valencia', province: 'Valencia', description: 'Gestor hipotecario en Valencia. Sin comisiones para el comprador, cobramos del banco.', shortDescription: 'Gestor hipotecario gratis Valencia', specializations: ['hipoteca', 'primera vivienda', 'joven', 'no residente'], tier: 'free', isVerified: true },
  // Architects
  { name: 'Estudio de Arquitectura Vanguardia', category: 'architect', city: 'Madrid', province: 'Madrid', description: 'Estudio de arquitectura especializado en reformas, rehabilitación y licencias urbanísticas.', shortDescription: 'Estudio arquitectura Madrid', specializations: ['licencias', 'rehabilitación', 'ITE', 'certificación energética', 'interiorismo'], tier: 'premium', isVerified: true },
  { name: 'Arquitectes Associats BCN', category: 'architect', city: 'Barcelona', province: 'Barcelona', description: 'Despacho de arquitectura en Barcelona. Proyectos residenciales y comerciales.', shortDescription: 'Arquitectura residencial Barcelona', specializations: ['proyecto básico', 'dirección obra', 'ITE', 'sostenibilidad'], tier: 'featured', isVerified: true },
  // Interior designers
  { name: 'Interiorismo Nuevo Hogar', category: 'interior_design', city: 'Madrid', province: 'Madrid', description: 'Estudio de interiorismo especializado en home staging y decoración de viviendas para venta.', shortDescription: 'Home staging y decoración Madrid', specializations: ['home staging', 'decoración', 'amueblamiento', 'fotografía inmobiliaria'], tier: 'premium', isVerified: true },
  { name: 'Disseny Interior Barcelona', category: 'interior_design', city: 'Barcelona', province: 'Barcelona', description: 'Estudio de diseño interior en Barcelona. Proyectos residenciales y espacios comerciales.', shortDescription: 'Diseño interior Barcelona', specializations: ['interiorismo', 'home staging', 'reforma decorativa', 'iluminación'], tier: 'featured', isVerified: true },
  // Málaga & Bilbao businesses
  { name: 'Notaría Costa del Sol', category: 'notary', city: 'Málaga', province: 'Málaga', description: 'Notaría en Málaga con atención multilingüe para compradores extranjeros.', shortDescription: 'Notaría multilingüe Málaga', specializations: ['compraventa extranjeros', 'golden visa', 'NIE', 'poderes'], tier: 'premium', isVerified: true },
  { name: 'Abogados Inmobiliarios Málaga', category: 'lawyer', city: 'Málaga', province: 'Málaga', description: 'Despacho jurídico en Málaga especializado en compraventa internacional y derecho urbanístico.', shortDescription: 'Abogados inmobiliarios Málaga', specializations: ['compraventa internacional', 'urbanismo', 'licencias turísticas'], tier: 'featured', isVerified: true },
  { name: 'Notaría Bilbao Abando', category: 'notary', city: 'Bilbao', province: 'Vizcaya', description: 'Notaría en el centro de Bilbao con especialización en derecho foral vasco.', shortDescription: 'Notaría Bilbao derecho foral', specializations: ['compraventa', 'derecho foral', 'testamentos', 'hipotecas'], tier: 'featured', isVerified: true },
  { name: 'Gestoría Bilbo', category: 'gestoria', city: 'Bilbao', province: 'Vizcaya', description: 'Gestoría administrativa en Bilbao. Trámites inmobiliarios y fiscales País Vasco.', shortDescription: 'Gestoría administrativa Bilbao', specializations: ['ITP', 'IRPF', 'hacienda foral', 'registro'], tier: 'free', isVerified: true },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seed() {
  console.log('Starting massive database seed...\n');

  try {
    // ---- CLEAR DATA (reverse FK order) ----
    console.log('Clearing existing data...');
    await db.delete(businessReviews);
    await db.delete(businessDirectory);
    await db.delete(providerPortfolio);
    await db.delete(providerReviews);
    await db.delete(serviceLeads);
    await db.delete(providerServices);
    await db.delete(serviceProviders);
    await db.delete(areaCentroids);
    await db.delete(leads);
    await db.delete(searchAlerts);
    await db.delete(userFavorites);
    await db.delete(priceHistory);
    await db.delete(listingImages);
    await db.delete(listings);
    await db.delete(sources);
    await db.delete(users);
    console.log('  Data cleared.\n');

    // ---- 1. USERS ----
    console.log('1. Inserting users...');
    const insertedUsers = await db.insert(users).values(
      USERS_DATA.map((u) => ({
        email: u.email,
        name: u.name,
        role: u.role,
        hashedPassword: u.hashedPassword ?? null,
        agencyName: ('agencyName' in u ? u.agencyName : null) as string | null,
        agencyPhone: ('agencyPhone' in u ? u.agencyPhone : null) as string | null,
        preferences: {
          defaultCity: randomItem(['Madrid', 'Barcelona', 'Valencia']),
          notifications: { email: true, push: false },
        },
        aiCreditsUsedThisMonth: randomInt(0, 50),
      }))
    ).returning();
    const userMap = new Map(insertedUsers.map((u) => [u.email, u.id]));
    const userIds = insertedUsers.map((u) => u.id);
    const regularUserIds = insertedUsers.filter((u) => u.role === 'user' || u.role === 'premium').map((u) => u.id);
    const agencyUserIds = insertedUsers.filter((u) => u.role === 'agency').map((u) => u.id);
    console.log(`  ${insertedUsers.length} users inserted.\n`);

    // ---- 2. SOURCES ----
    console.log('2. Inserting sources...');
    const insertedSources = await db.insert(sources).values(SOURCES_DATA).returning();
    const sourceMap = new Map(insertedSources.map((s) => [s.slug, s.id]));
    console.log(`  ${insertedSources.length} sources inserted.\n`);

    // ---- 3. LISTINGS (massive) ----
    console.log('3. Generating and inserting listings...');
    const listingTemplates = generateAllListings();
    const insertedListingIds: string[] = [];
    const listingCities: string[] = [];
    let listingCount = 0;

    for (const template of listingTemplates) {
      const sizeSqm = getSizeForType(template.propertyType);
      const price = generateListingPrice(template);
      const { rooms, bedrooms, bathrooms } = getRoomsForType(template.propertyType, sizeSqm);
      const hasGardenType = ['villa', 'chalet', 'house', 'townhouse'].includes(template.propertyType);
      const marketDays = template.daysOnMarket;
      const firstSeen = daysAgo(marketDays);
      const lastSeen = daysAgo(randomInt(0, 2));

      // Some listings get AI analysis data
      const hasAI = Math.random() > 0.3;
      const hasCadastral = Math.random() > 0.6;
      const hasImprovements = Math.random() > 0.5;

      const cadastralRef = hasCadastral
        ? `${randomInt(1000000, 9999999)}${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(1000, 9999)}`
        : null;

      const [insertedListing] = await db.insert(listings).values({
        title: template.title,
        description: template.description,
        propertyType: template.propertyType as typeof listings.$inferInsert.propertyType,
        operationType: template.operationType,
        address: `Calle ${randomItem(SPANISH_LAST_NAMES)} ${randomInt(1, 120)}`,
        city: template.city.name,
        neighborhood: template.neighborhood.name,
        province: template.city.province,
        postalCode: template.neighborhood.postalCode,
        country: 'España',
        latitude: (template.neighborhood.lat + randomDec(-0.005, 0.005, 7)).toString(),
        longitude: (template.neighborhood.lng + randomDec(-0.005, 0.005, 7)).toString(),
        price: price.toString(),
        pricePerSqm: Math.round(price / sizeSqm).toString(),
        sizeSqm,
        usableSizeSqm: Math.round(sizeSqm * randomDec(0.82, 0.95)),
        rooms,
        bedrooms,
        bathrooms,
        floor: ['villa', 'chalet', 'house', 'townhouse', 'land'].includes(template.propertyType) ? null : randomInt(0, 8),
        totalFloors: randomInt(3, 9),
        hasElevator: Math.random() > 0.4,
        hasParking: hasGardenType || Math.random() > 0.6,
        hasTerrace: Math.random() > 0.5,
        hasBalcony: Math.random() > 0.4,
        hasGarden: hasGardenType,
        hasPool: hasGardenType && Math.random() > 0.5,
        hasAirConditioning: Math.random() > 0.3,
        hasHeating: Math.random() > 0.3,
        heatingType: Math.random() > 0.5 ? randomItem([...HEATING_TYPES]) : null,
        orientation: randomItem([...ORIENTATIONS]),
        yearBuilt: randomInt(1960, 2024),
        energyRating: randomItem([...ENERGY_RATINGS]),
        sourceId: sourceMap.get(template.sourceSlug) ?? sourceMap.get('usuario'),
        externalId: `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: Math.random() > 0.1 ? 'active' : randomItem(['inactive', 'sold', 'rented', 'pending']),
        firstSeenAt: firstSeen,
        lastSeenAt: lastSeen,
        // AI fields
        authenticityScore: hasAI ? randomInt(65, 100) : null,
        qualityScore: hasAI ? randomInt(50, 100) : null,
        valuationEstimate: hasAI ? (price * randomDec(0.85, 1.15)).toFixed(2) : null,
        valuationConfidence: hasAI ? randomDec(0.55, 0.95, 2).toString() : null,
        aiHighlights: hasAI ? [
          'Buena ubicación con transporte público cercano',
          'Orientación favorable con buena iluminación natural',
          `${sizeSqm}m² bien distribuidos`,
        ] : null,
        aiIssues: hasAI && Math.random() > 0.6 ? [
          { type: 'energy', description: 'Certificación energética mejorable', severity: 'low' as const },
        ] : null,
        // Cadastral
        cadastralRef,
        cadastralVerified: hasCadastral && Math.random() > 0.3,
        cadastralSurface: hasCadastral ? sizeSqm + randomInt(-5, 5) : null,
        cadastralUse: hasCadastral ? 'Residencial' : null,
        cadastralConstructionYear: hasCadastral ? randomInt(1960, 2020) : null,
        // Improvements
        improvements: hasImprovements
          ? Array.from({ length: randomInt(1, 3) }, () => randomItem(SAMPLE_IMPROVEMENTS))
          : null,
      }).returning();

      insertedListingIds.push(insertedListing.id);
      listingCities.push(template.city.name);

      // Insert images (2-5 per listing)
      const imgCount = randomInt(2, 5);
      const imgValues = Array.from({ length: imgCount }, (_, i) => ({
        listingId: insertedListing.id,
        originalUrl: UNSPLASH_PROPERTY[i % UNSPLASH_PROPERTY.length],
        cdnUrl: UNSPLASH_PROPERTY[i % UNSPLASH_PROPERTY.length],
        position: i,
        roomType: randomItem(['living_room', 'bedroom', 'bathroom', 'kitchen', 'terrace', 'other']) as typeof listingImages.$inferInsert.roomType,
        authenticityScore: randomInt(70, 100),
        qualityScore: randomInt(50, 100),
      }));
      await db.insert(listingImages).values(imgValues);

      // Insert price history
      const prices = generatePriceHistory(price, marketDays);
      for (let i = 0; i < prices.length; i++) {
        await db.insert(priceHistory).values({
          listingId: insertedListing.id,
          price: prices[i].toString(),
          recordedAt: daysAgo(marketDays - i * Math.floor(marketDays / prices.length)),
        });
      }

      listingCount++;
      if (listingCount % 25 === 0) {
        console.log(`  ${listingCount}/${listingTemplates.length} listings...`);
      }
    }
    console.log(`  ${listingCount} listings inserted.\n`);

    // ---- 4. USER FAVORITES ----
    console.log('4. Inserting user favorites...');
    const favoriteValues = [];
    for (const userId of regularUserIds) {
      const favCount = randomInt(2, 8);
      const favListings = [...insertedListingIds].sort(() => Math.random() - 0.5).slice(0, favCount);
      for (const listingId of favListings) {
        favoriteValues.push({ userId, listingId, createdAt: daysAgo(randomInt(0, 30)) });
      }
    }
    if (favoriteValues.length > 0) {
      await db.insert(userFavorites).values(favoriteValues);
    }
    console.log(`  ${favoriteValues.length} favorites inserted.\n`);

    // ---- 5. SEARCH ALERTS ----
    console.log('5. Inserting search alerts...');
    const alertValues = [];
    for (const userId of regularUserIds.slice(0, 10)) {
      const city = randomItem(CITIES);
      alertValues.push({
        userId,
        name: `Alertas ${city.name}`,
        filters: {
          city: city.name,
          operationType: randomItem(['sale', 'rent']),
          priceMin: randomInt(100000, 300000),
          priceMax: randomInt(400000, 800000),
          rooms: randomInt(2, 4),
        },
        frequency: randomItem(['daily', 'weekly', 'instant']),
        isActive: Math.random() > 0.2,
      });
    }
    if (alertValues.length > 0) {
      await db.insert(searchAlerts).values(alertValues);
    }
    console.log(`  ${alertValues.length} search alerts inserted.\n`);

    // ---- 6. LEADS ----
    console.log('6. Inserting leads...');
    const leadValues = [];
    for (let i = 0; i < 60; i++) {
      const name = randomName();
      leadValues.push({
        listingId: randomItem(insertedListingIds),
        userId: Math.random() > 0.5 ? randomItem(regularUserIds) : null,
        name,
        email: randomEmail(name),
        phone: randomPhone(),
        message: randomItem([
          'Me interesa esta propiedad, ¿es posible concertar una visita?',
          'Buenos días, me gustaría recibir más información sobre este inmueble.',
          '¿Está disponible para visitar este fin de semana?',
          'Me gustaría saber si el precio es negociable.',
          '¿Tiene plaza de garaje disponible?',
          'Interesado en alquilar, ¿cuáles son las condiciones?',
        ]),
        status: randomItem(['new', 'contacted', 'qualified', 'converted', 'lost']) as typeof leads.$inferInsert.status,
        source: randomItem(['organic', 'google', 'partner', 'social']),
        distributedTo: Math.random() > 0.5 ? randomItem(agencyUserIds) : null,
        createdAt: daysAgo(randomInt(0, 60)),
      });
    }
    if (leadValues.length > 0) {
      await db.insert(leads).values(leadValues);
    }
    console.log(`  ${leadValues.length} leads inserted.\n`);

    // ---- 7. SERVICE PROVIDERS ----
    console.log('7. Inserting service providers...');
    const insertedProviderIds: string[] = [];

    for (const prov of PROVIDERS_DATA) {
      const contactName = randomName();
      const [insertedProvider] = await db.insert(serviceProviders).values({
        businessName: prov.businessName,
        slug: slugify(prov.businessName),
        description: prov.description,
        contactName,
        contactEmail: randomEmail(contactName),
        contactPhone: randomPhone(),
        website: `https://www.${slugify(prov.businessName)}.es`,
        address: `Calle ${randomItem(SPANISH_LAST_NAMES)} ${randomInt(1, 80)}`,
        city: prov.city,
        province: prov.province,
        postalCode: randomItem(CITIES.find((c) => c.name === prov.city)?.neighborhoods ?? [{ name: 'Centro', postalCode: '28001', lat: 40.4168, lng: -3.7038, premium: false }]).postalCode,
        latitude: prov.lat.toString(),
        longitude: prov.lng.toString(),
        coverageRadiusKm: randomInt(10, 50),
        status: 'active',
        tier: prov.tier,
        isVerified: prov.isVerified,
        verifiedAt: prov.isVerified ? daysAgo(randomInt(30, 365)) : null,
        totalReviews: randomInt(5, 80),
        averageRating: randomDec(3.5, 5.0, 1).toString(),
        totalLeads: randomInt(10, 200),
        leadsThisMonth: randomInt(0, 15),
        responseTimeMinutes: randomInt(15, 480),
        metadata: {
          yearsInBusiness: prov.yearsInBusiness,
          employeeCount: randomInt(2, 30),
          certifications: Math.random() > 0.5 ? ['ISO 9001', 'Gremio Certificado'] : [],
        },
      }).returning();

      insertedProviderIds.push(insertedProvider.id);

      // Insert services for this provider
      for (const svc of prov.services) {
        await db.insert(providerServices).values({
          providerId: insertedProvider.id,
          category: svc.category as typeof providerServices.$inferInsert.category,
          title: svc.title,
          description: `${svc.title} profesional con garantía.`,
          priceMin: svc.priceMin.toString(),
          priceMax: svc.priceMax.toString(),
          priceUnit: svc.priceUnit,
          isActive: true,
        });
      }
    }
    console.log(`  ${PROVIDERS_DATA.length} providers with services inserted.\n`);

    // ---- 8. SERVICE LEADS ----
    console.log('8. Inserting service leads...');
    const serviceLeadValues = [];
    for (let i = 0; i < 40; i++) {
      const clientName = randomName();
      const providerId = randomItem(insertedProviderIds);
      const cityName = randomItem(CITIES).name;

      serviceLeadValues.push({
        providerId,
        listingId: Math.random() > 0.4 ? randomItem(insertedListingIds) : null,
        category: randomItem(['painting', 'renovation', 'electrical', 'plumbing', 'garden', 'general']) as typeof serviceLeads.$inferInsert.category,
        clientName,
        clientEmail: randomEmail(clientName),
        clientPhone: randomPhone(),
        workCity: cityName,
        title: randomItem([
          'Reforma cocina completa', 'Pintura piso 3 habitaciones', 'Instalación aire acondicionado',
          'Reparación urgente fontanería', 'Diseño jardín terraza', 'Reforma baño',
          'Cambio ventanas', 'Instalación eléctrica nueva', 'Limpieza fin de obra',
        ]),
        description: 'Necesito presupuesto para este trabajo. Disponibilidad flexible.',
        budget: randomInt(500, 20000).toString(),
        urgency: randomItem(['low', 'normal', 'high']),
        status: randomItem(['new', 'viewed', 'contacted', 'quoted', 'accepted', 'completed']) as typeof serviceLeads.$inferInsert.status,
        source: 'marketplace',
        createdAt: daysAgo(randomInt(0, 90)),
      });
    }
    if (serviceLeadValues.length > 0) {
      await db.insert(serviceLeads).values(serviceLeadValues);
    }
    const insertedServiceLeads = await db.insert(serviceLeads).values([]).returning().catch(() => []);
    console.log(`  ${serviceLeadValues.length} service leads inserted.\n`);

    // ---- 9. PROVIDER REVIEWS ----
    console.log('9. Inserting provider reviews...');
    let reviewCount = 0;
    for (const providerId of insertedProviderIds) {
      const numReviews = randomInt(2, 8);
      for (let i = 0; i < numReviews; i++) {
        const authorName = randomName();
        const rating = randomInt(3, 5);
        await db.insert(providerReviews).values({
          providerId,
          userId: Math.random() > 0.5 ? randomItem(regularUserIds) : null,
          authorName,
          authorEmail: randomEmail(authorName),
          rating,
          title: randomItem([
            'Excelente trabajo', 'Muy profesionales', 'Buen servicio', 'Recomendado',
            'Cumplieron plazos', 'Calidad aceptable', 'Gran experiencia',
          ]),
          content: randomItem([
            'Hicieron un trabajo impecable. Cumplieron plazos y presupuesto. Muy recomendables.',
            'Buenos profesionales, atención personalizada. Volveré a contar con ellos.',
            'El resultado fue satisfactorio aunque hubo un pequeño retraso en la entrega.',
            'Trabajo correcto, precio competitivo. Sin sorpresas.',
            'Excelente relación calidad-precio. Muy contentos con el resultado final.',
          ]),
          qualityRating: randomInt(3, 5),
          communicationRating: randomInt(3, 5),
          timelinessRating: randomInt(2, 5),
          valueRating: randomInt(3, 5),
          category: randomItem(['painting', 'renovation', 'electrical', 'plumbing', 'garden', 'general']) as typeof providerReviews.$inferInsert.category,
          isVerified: Math.random() > 0.4,
          isPublished: true,
          providerResponse: Math.random() > 0.5 ? 'Gracias por su valoración. Ha sido un placer trabajar con usted.' : null,
          createdAt: daysAgo(randomInt(5, 365)),
        });
        reviewCount++;
      }
    }
    console.log(`  ${reviewCount} provider reviews inserted.\n`);

    // ---- 10. PROVIDER PORTFOLIO ----
    console.log('10. Inserting provider portfolio...');
    let portfolioCount = 0;
    for (const providerId of insertedProviderIds) {
      if (Math.random() > 0.4) {
        const numProjects = randomInt(2, 5);
        for (let i = 0; i < numProjects; i++) {
          await db.insert(providerPortfolio).values({
            providerId,
            category: randomItem(['painting', 'renovation', 'electrical', 'plumbing', 'garden', 'general']) as typeof providerPortfolio.$inferInsert.category,
            title: randomItem([
              'Reforma integral piso 80m²', 'Pintura local comercial', 'Cocina moderna minimalista',
              'Baño de diseño', 'Jardín paisajístico', 'Instalación domótica completa',
              'Rehabilitación fachada', 'Terraza ajardinada', 'Reforma completa vivienda',
            ]),
            description: 'Proyecto realizado con materiales de primera calidad y acabados profesionales.',
            imageUrl: randomItem(UNSPLASH_PORTFOLIO),
            thumbnailUrl: randomItem(UNSPLASH_PORTFOLIO),
            position: i,
            projectDate: daysAgo(randomInt(30, 730)),
            projectDuration: randomItem(['1 semana', '2 semanas', '1 mes', '2 meses', '3 meses']),
            projectCost: randomInt(2000, 40000).toString(),
            isPublished: true,
          });
          portfolioCount++;
        }
      }
    }
    console.log(`  ${portfolioCount} portfolio items inserted.\n`);

    // ---- 11. AREA CENTROIDS ----
    console.log('11. Inserting area centroids...');
    const centroidValues = [];
    for (const city of CITIES) {
      // City-level centroid
      centroidValues.push({
        city: city.name,
        neighborhood: null as string | null,
        province: city.province,
        latitude: city.lat.toString(),
        longitude: city.lng.toString(),
        areaRadiusKm: '15',
        source: 'seed',
      });
      // Neighborhood-level centroids
      for (const nb of city.neighborhoods) {
        centroidValues.push({
          city: city.name,
          neighborhood: nb.name,
          province: city.province,
          latitude: nb.lat.toString(),
          longitude: nb.lng.toString(),
          areaRadiusKm: '3',
          source: 'seed',
        });
      }
    }
    await db.insert(areaCentroids).values(centroidValues);
    console.log(`  ${centroidValues.length} area centroids inserted.\n`);

    // ---- 12. BUSINESS DIRECTORY ----
    console.log('12. Inserting business directory...');
    const insertedBusinessIds: string[] = [];

    for (const biz of BUSINESSES_DATA) {
      const cityData = CITIES.find((c) => c.name === biz.city);
      const neighborhood = cityData ? randomItem(cityData.neighborhoods) : null;
      const contactName = randomName();

      const [insertedBiz] = await db.insert(businessDirectory).values({
        name: biz.name,
        slug: slugify(biz.name),
        category: biz.category as typeof businessDirectory.$inferInsert.category,
        description: biz.description,
        shortDescription: biz.shortDescription,
        contactName,
        email: randomEmail(contactName),
        phone: randomPhone(),
        website: `https://www.${slugify(biz.name)}.es`,
        address: `Calle ${randomItem(SPANISH_LAST_NAMES)} ${randomInt(1, 100)}`,
        city: biz.city,
        province: biz.province,
        postalCode: neighborhood?.postalCode ?? '28001',
        latitude: cityData ? (cityData.lat + randomDec(-0.01, 0.01, 7)).toString() : '40.4168',
        longitude: cityData ? (cityData.lng + randomDec(-0.01, 0.01, 7)).toString() : '-3.7038',
        coverageCities: [biz.city],
        specializations: biz.specializations,
        languages: biz.city === 'Barcelona' ? ['es', 'ca'] : biz.city === 'Bilbao' ? ['es', 'eu'] : ['es'],
        tier: biz.tier,
        status: 'active',
        isVerified: biz.isVerified,
        verifiedAt: biz.isVerified ? daysAgo(randomInt(30, 365)) : null,
        totalReviews: randomInt(3, 50),
        averageRating: randomDec(3.8, 5.0, 1).toString(),
        totalTransactions: randomInt(10, 500),
        avgResponseTimeHours: randomDec(1, 48, 1).toString(),
        completionRate: randomDec(0.85, 0.99, 2).toString(),
        totalApiQueries: randomInt(0, 1000),
        ownerId: Math.random() > 0.7 ? randomItem(userIds) : null,
      }).returning();

      insertedBusinessIds.push(insertedBiz.id);
    }
    console.log(`  ${BUSINESSES_DATA.length} business directory entries inserted.\n`);

    // ---- 13. BUSINESS REVIEWS ----
    console.log('13. Inserting business reviews...');
    let bizReviewCount = 0;
    for (const businessId of insertedBusinessIds) {
      const numReviews = randomInt(2, 6);
      for (let i = 0; i < numReviews; i++) {
        const rating = randomInt(3, 5);
        await db.insert(businessReviews).values({
          businessId,
          userId: Math.random() > 0.4 ? randomItem(regularUserIds) : null,
          rating,
          title: randomItem([
            'Servicio excelente', 'Muy profesionales', 'Recomendable', 'Buen trato',
            'Eficientes y rápidos', 'Buena experiencia', 'Satisfecho con el servicio',
          ]),
          content: randomItem([
            'Nos atendieron muy bien y todo fue rápido y profesional. Totalmente recomendable.',
            'Buenos profesionales, conocen bien el sector inmobiliario de la zona.',
            'El servicio fue correcto aunque los tiempos de espera podrían mejorar.',
            'Excelente atención personalizada. Resolvieron todas mis dudas.',
            'Precio justo por un servicio de calidad. Repetiré seguro.',
          ]),
          qualityRating: randomInt(3, 5),
          communicationRating: randomInt(3, 5),
          timelinessRating: randomInt(2, 5),
          valueRating: randomInt(3, 5),
          serviceType: randomItem(['compraventa', 'alquiler', 'reforma', 'trámites', 'asesoría']),
          city: randomItem(CITIES).name,
          isVerified: Math.random() > 0.4,
          isPublished: true,
          businessResponse: Math.random() > 0.6 ? 'Gracias por confiar en nosotros. Quedamos a su disposición.' : null,
          createdAt: daysAgo(randomInt(5, 365)),
        });
        bizReviewCount++;
      }
    }
    console.log(`  ${bizReviewCount} business reviews inserted.\n`);

    // ---- SUMMARY ----
    const cityCounts: Record<string, number> = {};
    for (const city of listingCities) {
      cityCounts[city] = (cityCounts[city] ?? 0) + 1;
    }

    console.log('=== SEED COMPLETE ===');
    console.log(`  Users:              ${insertedUsers.length}`);
    console.log(`  Sources:            ${insertedSources.length}`);
    console.log(`  Listings:           ${listingCount}`);
    for (const [city, count] of Object.entries(cityCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`    - ${city}: ${count}`);
    }
    console.log(`  Favorites:          ${favoriteValues.length}`);
    console.log(`  Search Alerts:      ${alertValues.length}`);
    console.log(`  Leads:              ${leadValues.length}`);
    console.log(`  Service Providers:  ${PROVIDERS_DATA.length}`);
    console.log(`  Service Leads:      ${serviceLeadValues.length}`);
    console.log(`  Provider Reviews:   ${reviewCount}`);
    console.log(`  Portfolio Items:    ${portfolioCount}`);
    console.log(`  Area Centroids:     ${centroidValues.length}`);
    console.log(`  Business Directory: ${BUSINESSES_DATA.length}`);
    console.log(`  Business Reviews:   ${bizReviewCount}`);

  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run
seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
