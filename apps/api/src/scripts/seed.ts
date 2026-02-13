import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  sources,
  listings,
  listingImages,
  priceHistory,
} from '../server/infrastructure/database/schema';

// Direct database connection for scripts
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

const SOURCES_DATA = [
  { name: 'Idealista', slug: 'idealista', baseUrl: 'https://www.idealista.com', website: 'https://www.idealista.com' },
  { name: 'Fotocasa', slug: 'fotocasa', baseUrl: 'https://www.fotocasa.es', website: 'https://www.fotocasa.es' },
  { name: 'Habitaclia', slug: 'habitaclia', baseUrl: 'https://www.habitaclia.com', website: 'https://www.habitaclia.com' },
  { name: 'InmoAI', slug: 'inmoai', baseUrl: 'https://www.inmoai.es', website: 'https://www.inmoai.es' },
];

// Helper to generate dates relative to now
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Helper to generate external URLs
const generateExternalUrl = (sourceSlug: string, id: string) => {
  const urls: Record<string, string> = {
    idealista: `https://www.idealista.com/inmueble/${id}/`,
    fotocasa: `https://www.fotocasa.es/es/comprar/vivienda/${id}`,
    habitaclia: `https://www.habitaclia.com/comprar-piso/${id}.htm`,
  };
  return urls[sourceSlug] || null;
};

// Generate price history with potential drops for older listings
const generatePriceHistory = (currentPrice: number, daysOnMarket: number): number[] => {
  if (daysOnMarket < 30) return [currentPrice];

  // Generate price drops for older listings (more drops = more motivated seller)
  const drops = Math.min(Math.floor(daysOnMarket / 45), 3);
  const prices: number[] = [currentPrice];
  let price = currentPrice;

  for (let i = 0; i < drops; i++) {
    // Previous prices were 3-8% higher
    price = Math.round(price * (1 + (Math.random() * 0.05 + 0.03)));
    prices.unshift(price);
  }

  return prices;
};

// AI-detected improvements for the future marketplace feature
// Structure matches ImprovementSuggestions component
const SAMPLE_IMPROVEMENTS = [
  {
    id: 'imp-1',
    category: 'renovation' as const,
    title: 'Reforma de cocina completa',
    description: 'La cocina muestra signos de antigüedad. Una reforma moderna aumentaría significativamente el valor.',
    estimatedCost: { min: 6000, max: 10000 },
    potentialValueIncrease: 8,
    priority: 'high' as const,
    detectedFrom: 'Análisis de imagen - Cocina',
  },
  {
    id: 'imp-2',
    category: 'plumbing' as const,
    title: 'Actualización de baños',
    description: 'Los baños presentan elementos antiguos que podrían modernizarse.',
    estimatedCost: { min: 3500, max: 5500 },
    potentialValueIncrease: 5,
    priority: 'medium' as const,
    detectedFrom: 'Análisis de imagen - Baño',
  },
  {
    id: 'imp-3',
    category: 'painting' as const,
    title: 'Pintura integral',
    description: 'Se detectan paredes con necesidad de repintado para mejorar la presentación.',
    estimatedCost: { min: 1500, max: 2500 },
    potentialValueIncrease: 3,
    priority: 'low' as const,
    detectedFrom: 'Análisis general de imágenes',
  },
  {
    id: 'imp-4',
    category: 'renovation' as const,
    title: 'Cambio de suelos',
    description: 'Los suelos actuales podrían reemplazarse por parquet o tarima flotante moderna.',
    estimatedCost: { min: 4500, max: 7000 },
    potentialValueIncrease: 6,
    priority: 'medium' as const,
    detectedFrom: 'Análisis de imagen - Salón',
  },
  {
    id: 'imp-5',
    category: 'general' as const,
    title: 'Mejora de ventanas',
    description: 'Ventanas antiguas detectadas. Cambio a doble acristalamiento mejora eficiencia energética.',
    estimatedCost: { min: 4000, max: 6000 },
    potentialValueIncrease: 4,
    priority: 'high' as const,
    detectedFrom: 'Análisis de certificación energética',
  },
];

const MOCK_LISTINGS = [
  // ============ INMOAI NATIVE LISTINGS (para probar ContactForm) ============
  {
    title: 'Piso exclusivo InmoAI - Contacto directo',
    description: 'Propiedad verificada y gestionada directamente por InmoAI. Contacta con nosotros para visitas.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 285000,
    city: 'Madrid',
    neighborhood: 'Chamartín',
    province: 'Madrid',
    postalCode: '28002',
    sizeSqm: 95,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    floor: 4,
    totalFloors: 7,
    hasElevator: true,
    hasBalcony: true,
    hasAirConditioning: true,
    authenticityScore: 100,
    sourceSlug: 'inmoai', // NATIVE - shows ContactForm
    daysOnMarket: 5,
    priceHistory: [285000],
    improvements: [SAMPLE_IMPROVEMENTS[0], SAMPLE_IMPROVEMENTS[2]], // kitchen + paint
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Chalet InmoAI con gestión integral',
    description: 'Chalet gestionado por InmoAI con servicio completo de visitas y negociación.',
    propertyType: 'villa' as const,
    operationType: 'sale' as const,
    price: 650000,
    city: 'Barcelona',
    neighborhood: 'Pedralbes',
    province: 'Barcelona',
    postalCode: '08034',
    sizeSqm: 280,
    rooms: 6,
    bedrooms: 5,
    bathrooms: 3,
    hasGarden: true,
    hasPool: true,
    hasParking: true,
    hasAirConditioning: true,
    authenticityScore: 100,
    sourceSlug: 'inmoai', // NATIVE - shows ContactForm
    daysOnMarket: 12,
    priceHistory: [650000],
    improvements: [SAMPLE_IMPROVEMENTS[4]], // windows
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    ],
  },
  // ============ MADRID (10 listings) ============
  // ============ MADRID (10 listings) ============
  {
    title: 'Ático luminoso con terraza panorámica',
    description: 'Espectacular ático con amplias terrazas y vistas despejadas. Totalmente reformado con materiales de primera calidad.',
    propertyType: 'penthouse' as const,
    operationType: 'sale' as const,
    price: 425000,
    city: 'Madrid',
    neighborhood: 'Chamberí',
    province: 'Madrid',
    postalCode: '28010',
    sizeSqm: 120,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    floor: 6,
    totalFloors: 6,
    hasElevator: true,
    hasTerrace: true,
    hasAirConditioning: true,
    authenticityScore: 94,
    sourceSlug: 'idealista',
    daysOnMarket: 3, // Recién publicado
    priceHistory: [425000], // Sin bajadas
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso reformado cerca del Retiro',
    description: 'Bonito piso completamente reformado a un paso del parque del Retiro. Ideal para familias.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 380000,
    city: 'Madrid',
    neighborhood: 'Retiro',
    province: 'Madrid',
    postalCode: '28009',
    sizeSqm: 85,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    floor: 3,
    totalFloors: 5,
    hasElevator: true,
    hasBalcony: true,
    hasHeating: true,
    authenticityScore: 88,
    sourceSlug: 'fotocasa',
    daysOnMarket: 45, // Medium time - for availability testing
    improvements: [SAMPLE_IMPROVEMENTS[1], SAMPLE_IMPROVEMENTS[3]], // bathrooms + flooring
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Dúplex con jardín privado',
    description: 'Precioso dúplex con jardín privado en zona residencial. Perfecto para familias con niños.',
    propertyType: 'duplex' as const,
    operationType: 'sale' as const,
    price: 520000,
    city: 'Madrid',
    neighborhood: 'Pozuelo de Alarcón',
    province: 'Madrid',
    postalCode: '28223',
    sizeSqm: 180,
    rooms: 5,
    bedrooms: 4,
    bathrooms: 3,
    hasGarden: true,
    hasParking: true,
    hasPool: false,
    authenticityScore: 96,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Estudio moderno en el centro',
    description: 'Moderno estudio en pleno centro de Madrid. Ideal para inversión o primera vivienda.',
    propertyType: 'studio' as const,
    operationType: 'sale' as const,
    price: 195000,
    city: 'Madrid',
    neighborhood: 'Sol',
    province: 'Madrid',
    postalCode: '28013',
    sizeSqm: 45,
    rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    floor: 2,
    totalFloors: 4,
    hasElevator: false,
    hasAirConditioning: true,
    authenticityScore: 72,
    sourceSlug: 'fotocasa',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Chalet independiente con piscina',
    description: 'Impresionante chalet independiente con piscina privada y amplios jardines. Máxima privacidad.',
    propertyType: 'villa' as const,
    operationType: 'sale' as const,
    price: 890000,
    city: 'Madrid',
    neighborhood: 'La Moraleja',
    province: 'Madrid',
    postalCode: '28109',
    sizeSqm: 350,
    rooms: 7,
    bedrooms: 5,
    bathrooms: 4,
    hasGarden: true,
    hasPool: true,
    hasParking: true,
    hasAirConditioning: true,
    authenticityScore: 91,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso con vistas al parque',
    description: 'Luminoso piso con vistas al parque. Exterior, muy tranquilo, perfecto para vivir.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 310000,
    city: 'Madrid',
    neighborhood: 'Moncloa',
    province: 'Madrid',
    postalCode: '28008',
    sizeSqm: 95,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    floor: 4,
    totalFloors: 6,
    hasElevator: true,
    hasBalcony: true,
    authenticityScore: 85,
    sourceSlug: 'habitaclia',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Apartamento moderno en alquiler',
    description: 'Apartamento totalmente equipado en zona céntrica. Ideal para profesionales.',
    propertyType: 'apartment' as const,
    operationType: 'rent' as const,
    price: 1200,
    city: 'Madrid',
    neighborhood: 'Malasaña',
    province: 'Madrid',
    postalCode: '28004',
    sizeSqm: 60,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    floor: 3,
    totalFloors: 5,
    hasElevator: true,
    hasAirConditioning: true,
    authenticityScore: 89,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Loft industrial reformado',
    description: 'Espectacular loft industrial completamente reformado. Espacios diáfanos y techos altos.',
    propertyType: 'loft' as const,
    operationType: 'rent' as const,
    price: 1800,
    city: 'Madrid',
    neighborhood: 'Lavapiés',
    province: 'Madrid',
    postalCode: '28012',
    sizeSqm: 110,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 2,
    hasAirConditioning: true,
    authenticityScore: 93,
    sourceSlug: 'fotocasa',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso amplio en Salamanca',
    description: 'Elegante piso en el barrio de Salamanca. Techos altos, suelos de madera, muy luminoso.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 650000,
    city: 'Madrid',
    neighborhood: 'Salamanca',
    province: 'Madrid',
    postalCode: '28001',
    sizeSqm: 140,
    rooms: 5,
    bedrooms: 4,
    bathrooms: 2,
    floor: 2,
    totalFloors: 6,
    hasElevator: true,
    hasBalcony: true,
    hasHeating: true,
    authenticityScore: 97,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso económico en Vallecas',
    description: 'Piso bien comunicado en Vallecas. Ideal para primera vivienda o inversión.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 145000,
    city: 'Madrid',
    neighborhood: 'Vallecas',
    province: 'Madrid',
    postalCode: '28018',
    sizeSqm: 65,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    floor: 1,
    totalFloors: 5,
    hasElevator: false,
    authenticityScore: 78,
    sourceSlug: 'habitaclia',
    daysOnMarket: 120, // Old listing - low availability
    priceHistory: [165000, 155000, 145000], // Multiple price drops = motivated seller
    improvements: [SAMPLE_IMPROVEMENTS[0], SAMPLE_IMPROVEMENTS[1], SAMPLE_IMPROVEMENTS[2], SAMPLE_IMPROVEMENTS[3]], // Needs work
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },

  // ============ BARCELONA (10 listings) ============
  {
    title: 'Piso con vistas al mar en Barceloneta',
    description: 'Espectacular piso en primera línea de playa. Vistas panorámicas al Mediterráneo.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 520000,
    city: 'Barcelona',
    neighborhood: 'Barceloneta',
    province: 'Barcelona',
    postalCode: '08003',
    sizeSqm: 75,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    floor: 5,
    totalFloors: 6,
    hasElevator: true,
    hasTerrace: true,
    hasAirConditioning: true,
    authenticityScore: 92,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Ático en el Eixample',
    description: 'Precioso ático con terraza en el corazón del Eixample. Edificio modernista rehabilitado.',
    propertyType: 'penthouse' as const,
    operationType: 'sale' as const,
    price: 680000,
    city: 'Barcelona',
    neighborhood: 'Eixample',
    province: 'Barcelona',
    postalCode: '08007',
    sizeSqm: 130,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    floor: 5,
    totalFloors: 5,
    hasElevator: true,
    hasTerrace: true,
    hasAirConditioning: true,
    authenticityScore: 95,
    sourceSlug: 'fotocasa',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso en Gràcia con encanto',
    description: 'Acogedor piso en el bohemio barrio de Gràcia. Cerca de plazas y ambiente único.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 340000,
    city: 'Barcelona',
    neighborhood: 'Gràcia',
    province: 'Barcelona',
    postalCode: '08012',
    sizeSqm: 70,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    floor: 3,
    totalFloors: 4,
    hasElevator: false,
    hasBalcony: true,
    authenticityScore: 87,
    sourceSlug: 'habitaclia',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Casa con jardín en Sarrià',
    description: 'Preciosa casa unifamiliar con jardín en la tranquila zona de Sarrià. Ideal para familias.',
    propertyType: 'house' as const,
    operationType: 'sale' as const,
    price: 1200000,
    city: 'Barcelona',
    neighborhood: 'Sarrià-Sant Gervasi',
    province: 'Barcelona',
    postalCode: '08017',
    sizeSqm: 250,
    rooms: 6,
    bedrooms: 4,
    bathrooms: 3,
    hasGarden: true,
    hasParking: true,
    hasPool: false,
    authenticityScore: 98,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Estudio en el Born',
    description: 'Moderno estudio en el trendy barrio del Born. Perfecto para inversión turística.',
    propertyType: 'studio' as const,
    operationType: 'sale' as const,
    price: 235000,
    city: 'Barcelona',
    neighborhood: 'El Born',
    province: 'Barcelona',
    postalCode: '08003',
    sizeSqm: 40,
    rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    floor: 1,
    totalFloors: 4,
    hasAirConditioning: true,
    authenticityScore: 81,
    sourceSlug: 'fotocasa',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso reformado en Poblenou',
    description: 'Piso totalmente reformado en el distrito tecnológico 22@. Diseño contemporáneo.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 395000,
    city: 'Barcelona',
    neighborhood: 'Poblenou',
    province: 'Barcelona',
    postalCode: '08005',
    sizeSqm: 85,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 2,
    floor: 4,
    totalFloors: 6,
    hasElevator: true,
    hasTerrace: true,
    hasAirConditioning: true,
    authenticityScore: 90,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Apartamento en alquiler en Sant Antoni',
    description: 'Bonito apartamento amueblado en Sant Antoni. Metro y mercado a 2 minutos.',
    propertyType: 'apartment' as const,
    operationType: 'rent' as const,
    price: 1400,
    city: 'Barcelona',
    neighborhood: 'Sant Antoni',
    province: 'Barcelona',
    postalCode: '08015',
    sizeSqm: 55,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    floor: 2,
    totalFloors: 5,
    hasElevator: true,
    hasAirConditioning: true,
    authenticityScore: 86,
    sourceSlug: 'habitaclia',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Loft en Pueblo Seco',
    description: 'Espectacular loft de diseño en Pueblo Seco. Cerca de Montjuïc y el centro.',
    propertyType: 'loft' as const,
    operationType: 'rent' as const,
    price: 1650,
    city: 'Barcelona',
    neighborhood: 'Poble Sec',
    province: 'Barcelona',
    postalCode: '08004',
    sizeSqm: 90,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    hasAirConditioning: true,
    authenticityScore: 88,
    sourceSlug: 'fotocasa',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso económico en Nou Barris',
    description: 'Piso a buen precio en Nou Barris. Bien comunicado con metro y bus.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 175000,
    city: 'Barcelona',
    neighborhood: 'Nou Barris',
    province: 'Barcelona',
    postalCode: '08042',
    sizeSqm: 60,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    floor: 3,
    totalFloors: 5,
    hasElevator: true,
    authenticityScore: 75,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Dúplex con terraza en Les Corts',
    description: 'Amplio dúplex con gran terraza privada. Zona tranquila cerca del Camp Nou.',
    propertyType: 'duplex' as const,
    operationType: 'sale' as const,
    price: 485000,
    city: 'Barcelona',
    neighborhood: 'Les Corts',
    province: 'Barcelona',
    postalCode: '08028',
    sizeSqm: 120,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    hasTerrace: true,
    hasParking: true,
    hasAirConditioning: true,
    authenticityScore: 93,
    sourceSlug: 'habitaclia',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    ],
  },

  // ============ VALENCIA (10 listings) ============
  {
    title: 'Piso cerca de la Ciudad de las Artes',
    description: 'Moderno piso a 5 minutos de la Ciudad de las Artes y las Ciencias. Zona en auge.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 220000,
    city: 'Valencia',
    neighborhood: 'Quatre Carreres',
    province: 'Valencia',
    postalCode: '46013',
    sizeSqm: 90,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    floor: 3,
    totalFloors: 6,
    hasElevator: true,
    hasBalcony: true,
    hasAirConditioning: true,
    authenticityScore: 89,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Ático en el centro histórico',
    description: 'Espectacular ático con terraza en pleno centro. Vistas a la Catedral.',
    propertyType: 'penthouse' as const,
    operationType: 'sale' as const,
    price: 380000,
    city: 'Valencia',
    neighborhood: 'Ciutat Vella',
    province: 'Valencia',
    postalCode: '46001',
    sizeSqm: 100,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 2,
    floor: 4,
    totalFloors: 4,
    hasElevator: true,
    hasTerrace: true,
    hasAirConditioning: true,
    authenticityScore: 94,
    sourceSlug: 'fotocasa',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso en Ruzafa reformado',
    description: 'Piso de diseño en el barrio más trendy de Valencia. Totalmente reformado.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 265000,
    city: 'Valencia',
    neighborhood: 'Ruzafa',
    province: 'Valencia',
    postalCode: '46006',
    sizeSqm: 80,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    floor: 2,
    totalFloors: 5,
    hasElevator: true,
    hasBalcony: true,
    authenticityScore: 91,
    sourceSlug: 'habitaclia',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Chalet con piscina en La Eliana',
    description: 'Fantástico chalet con piscina privada y amplios jardines. A 20 min del centro.',
    propertyType: 'villa' as const,
    operationType: 'sale' as const,
    price: 420000,
    city: 'Valencia',
    neighborhood: "L'Eliana",
    province: 'Valencia',
    postalCode: '46183',
    sizeSqm: 280,
    rooms: 6,
    bedrooms: 4,
    bathrooms: 3,
    hasGarden: true,
    hasPool: true,
    hasParking: true,
    hasAirConditioning: true,
    authenticityScore: 96,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Estudio cerca de la playa',
    description: 'Acogedor estudio a 200 metros de la playa de la Malvarrosa. Ideal veraneo.',
    propertyType: 'studio' as const,
    operationType: 'sale' as const,
    price: 125000,
    city: 'Valencia',
    neighborhood: 'Poblats Marítims',
    province: 'Valencia',
    postalCode: '46011',
    sizeSqm: 35,
    rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    floor: 1,
    totalFloors: 3,
    hasAirConditioning: true,
    authenticityScore: 79,
    sourceSlug: 'fotocasa',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso grande en Benimaclet',
    description: 'Amplio piso familiar en Benimaclet. Barrio universitario con mucha vida.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 195000,
    city: 'Valencia',
    neighborhood: 'Benimaclet',
    province: 'Valencia',
    postalCode: '46020',
    sizeSqm: 110,
    rooms: 5,
    bedrooms: 4,
    bathrooms: 2,
    floor: 2,
    totalFloors: 5,
    hasElevator: true,
    hasBalcony: true,
    authenticityScore: 84,
    sourceSlug: 'habitaclia',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Apartamento en alquiler en El Carmen',
    description: 'Bonito apartamento en el corazón del Carmen. Totalmente amueblado y equipado.',
    propertyType: 'apartment' as const,
    operationType: 'rent' as const,
    price: 850,
    city: 'Valencia',
    neighborhood: 'El Carmen',
    province: 'Valencia',
    postalCode: '46003',
    sizeSqm: 50,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    floor: 1,
    totalFloors: 3,
    hasAirConditioning: true,
    authenticityScore: 82,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Piso con garaje en Campanar',
    description: 'Piso exterior con plaza de garaje incluida. Cerca del nuevo hospital.',
    propertyType: 'apartment' as const,
    operationType: 'sale' as const,
    price: 185000,
    city: 'Valencia',
    neighborhood: 'Campanar',
    province: 'Valencia',
    postalCode: '46015',
    sizeSqm: 85,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 1,
    floor: 4,
    totalFloors: 7,
    hasElevator: true,
    hasParking: true,
    authenticityScore: 87,
    sourceSlug: 'fotocasa',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Loft en Patraix',
    description: 'Original loft en antigua fábrica rehabilitada. Techos altos y mucha luz.',
    propertyType: 'loft' as const,
    operationType: 'rent' as const,
    price: 950,
    city: 'Valencia',
    neighborhood: 'Patraix',
    province: 'Valencia',
    postalCode: '46018',
    sizeSqm: 70,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    hasAirConditioning: true,
    authenticityScore: 85,
    sourceSlug: 'habitaclia',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
  },
  {
    title: 'Casa adosada en Alboraya',
    description: 'Bonita casa adosada con jardín y piscina comunitaria. Cerca de la playa de la Patacona.',
    propertyType: 'townhouse' as const,
    operationType: 'sale' as const,
    price: 295000,
    city: 'Valencia',
    neighborhood: 'Alboraya',
    province: 'Valencia',
    postalCode: '46120',
    sizeSqm: 150,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    hasGarden: true,
    hasPool: true,
    hasParking: true,
    authenticityScore: 92,
    sourceSlug: 'idealista',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    ],
  },
];

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await db.delete(priceHistory);
    await db.delete(listingImages);
    await db.delete(listings);
    await db.delete(sources);

    // Insert sources
    console.log('Inserting sources...');
    const insertedSources = await db
      .insert(sources)
      .values(SOURCES_DATA)
      .returning();

    const sourceMap = new Map(insertedSources.map((s) => [s.slug, s.id]));
    console.log(`✅ Inserted ${insertedSources.length} sources`);

    // Insert listings
    console.log('Inserting listings...');
    let listingIndex = 0;
    for (const listing of MOCK_LISTINGS) {
      const { images, sourceSlug, daysOnMarket, priceHistory: priceHist, ...listingData } = listing as typeof listing & { daysOnMarket?: number; priceHistory?: number[] };
      const sourceId = sourceMap.get(sourceSlug);
      const externalId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Generate realistic dates based on listing index for variety
      const marketDays = daysOnMarket ?? [2, 5, 15, 30, 45, 60, 90, 120, 180][listingIndex % 9];
      const firstSeen = daysAgo(marketDays);
      const lastSeen = daysAgo(Math.floor(Math.random() * 3)); // 0-2 days ago

      const [insertedListing] = await db
        .insert(listings)
        .values({
          ...listingData,
          sourceId,
          externalId,
          externalUrl: generateExternalUrl(sourceSlug, externalId),
          status: 'active',
          price: listingData.price?.toString() ?? null,
          pricePerSqm: listingData.price && listingData.sizeSqm
            ? Math.round(listingData.price / listingData.sizeSqm).toString()
            : null,
          firstSeenAt: firstSeen,
          lastSeenAt: lastSeen,
        })
        .returning();

      // Insert images
      if (images.length > 0) {
        await db.insert(listingImages).values(
          images.map((url, index) => ({
            listingId: insertedListing.id,
            originalUrl: url,
            cdnUrl: url,
            position: index,
          }))
        );
      }

      // Insert price history with potential drops for older listings
      const prices = priceHist ?? generatePriceHistory(listingData.price, marketDays);
      for (let i = 0; i < prices.length; i++) {
        await db.insert(priceHistory).values({
          listingId: insertedListing.id,
          price: prices[i].toString(),
          recordedAt: daysAgo(marketDays - (i * Math.floor(marketDays / prices.length))),
        });
      }

      console.log(`  ✅ ${listingData.title} (${marketDays} días en mercado, ${prices.length} precios)`);
      listingIndex++;
    }

    console.log(`\n✅ Seed completed successfully!`);
    console.log(`   - ${insertedSources.length} sources`);
    console.log(`   - ${MOCK_LISTINGS.length} listings`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run seed
seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
