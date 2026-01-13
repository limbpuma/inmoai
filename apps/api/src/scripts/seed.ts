import 'dotenv/config';
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
  { name: 'Idealista', slug: 'idealista', baseUrl: 'https://www.idealista.com' },
  { name: 'Fotocasa', slug: 'fotocasa', baseUrl: 'https://www.fotocasa.es' },
  { name: 'Habitaclia', slug: 'habitaclia', baseUrl: 'https://www.habitaclia.com' },
];

const MOCK_LISTINGS = [
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
    for (const listing of MOCK_LISTINGS) {
      const { images, sourceSlug, ...listingData } = listing;
      const sourceId = sourceMap.get(sourceSlug);

      const [insertedListing] = await db
        .insert(listings)
        .values({
          ...listingData,
          sourceId,
          externalId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'active',
          pricePerSqm: listingData.price && listingData.sizeSqm
            ? Math.round(listingData.price / listingData.sizeSqm)
            : null,
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

      // Insert price history
      await db.insert(priceHistory).values({
        listingId: insertedListing.id,
        price: listingData.price.toString(),
      });

      console.log(`  ✅ ${listingData.title}`);
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
