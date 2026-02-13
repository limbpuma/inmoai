/**
 * Seed script for Service Marketplace
 * Run with: npx tsx src/scripts/seed-marketplace.ts
 */

import { db } from '../server/infrastructure/database';
import {
  serviceProviders,
  providerServices,
  areaCentroids,
  providerPortfolio,
  providerReviews,
  type ServiceCategory,
} from '../server/infrastructure/database/schema';

// Spanish city centroids
const CITY_CENTROIDS = [
  { city: 'Madrid', province: 'Madrid', latitude: 40.4168, longitude: -3.7038 },
  { city: 'Barcelona', province: 'Barcelona', latitude: 41.3851, longitude: 2.1734 },
  { city: 'Valencia', province: 'Valencia', latitude: 39.4699, longitude: -0.3763 },
  { city: 'Sevilla', province: 'Sevilla', latitude: 37.3891, longitude: -5.9845 },
  { city: 'Zaragoza', province: 'Zaragoza', latitude: 41.6488, longitude: -0.8891 },
  { city: 'Malaga', province: 'Malaga', latitude: 36.7213, longitude: -4.4214 },
  { city: 'Murcia', province: 'Murcia', latitude: 37.9922, longitude: -1.1307 },
  { city: 'Palma', province: 'Baleares', latitude: 39.5696, longitude: 2.6502 },
  { city: 'Las Palmas', province: 'Las Palmas', latitude: 28.1235, longitude: -15.4366 },
  { city: 'Bilbao', province: 'Vizcaya', latitude: 43.263, longitude: -2.935 },
  { city: 'Alicante', province: 'Alicante', latitude: 38.3452, longitude: -0.481 },
  { city: 'Cordoba', province: 'Cordoba', latitude: 37.8882, longitude: -4.7794 },
  { city: 'Valladolid', province: 'Valladolid', latitude: 41.6523, longitude: -4.7245 },
  { city: 'Vigo', province: 'Pontevedra', latitude: 42.2406, longitude: -8.7207 },
  { city: 'Gijon', province: 'Asturias', latitude: 43.5453, longitude: -5.6615 },
];

// Sample service providers
const SAMPLE_PROVIDERS = [
  {
    businessName: 'Pinturas Garcia',
    slug: 'pinturas-garcia-madrid',
    description: 'Empresa familiar con mas de 20 anos de experiencia en pintura de interiores y exteriores. Trabajamos con las mejores marcas del mercado.',
    contactName: 'Antonio Garcia',
    contactEmail: 'info@pinturasgarcia.es',
    contactPhone: '+34 612 345 678',
    city: 'Madrid',
    province: 'Madrid',
    latitude: 40.42,
    longitude: -3.71,
    coverageRadiusKm: 30,
    tier: 'premium' as const,
    averageRating: '4.8',
    totalReviews: 127,
    totalLeads: 345,
    responseTimeMinutes: 45,
    isVerified: true,
    categories: ['painting'] as ServiceCategory[],
    services: [
      { title: 'Pintura interior', priceMin: 500, priceMax: 3000, priceUnit: 'proyecto' },
      { title: 'Pintura exterior', priceMin: 1000, priceMax: 5000, priceUnit: 'proyecto' },
    ],
  },
  {
    businessName: 'Reformas Integrales Lopez',
    slug: 'reformas-lopez-madrid',
    description: 'Especialistas en reformas integrales de viviendas. Cocinas, banos, y reformas completas con materiales de primera calidad.',
    contactName: 'Carlos Lopez',
    contactEmail: 'contacto@reformaslopez.com',
    contactPhone: '+34 623 456 789',
    city: 'Madrid',
    province: 'Madrid',
    latitude: 40.45,
    longitude: -3.68,
    coverageRadiusKm: 40,
    tier: 'enterprise' as const,
    averageRating: '4.9',
    totalReviews: 89,
    totalLeads: 234,
    responseTimeMinutes: 30,
    isVerified: true,
    categories: ['renovation', 'general'] as ServiceCategory[],
    services: [
      { title: 'Reforma integral', priceMin: 15000, priceMax: 80000, priceUnit: 'proyecto' },
      { title: 'Reforma de bano', priceMin: 3000, priceMax: 12000, priceUnit: 'proyecto' },
      { title: 'Reforma de cocina', priceMin: 5000, priceMax: 20000, priceUnit: 'proyecto' },
    ],
  },
  {
    businessName: 'ElectroHogar Madrid',
    slug: 'electrohogar-madrid',
    description: 'Instalaciones electricas profesionales. Certificados por industria. Urgencias 24h disponibles.',
    contactName: 'Miguel Sanchez',
    contactEmail: 'urgencias@electrohogar.es',
    contactPhone: '+34 634 567 890',
    city: 'Madrid',
    province: 'Madrid',
    latitude: 40.38,
    longitude: -3.75,
    coverageRadiusKm: 25,
    tier: 'premium' as const,
    averageRating: '4.6',
    totalReviews: 203,
    totalLeads: 567,
    responseTimeMinutes: 60,
    isVerified: true,
    categories: ['electrical'] as ServiceCategory[],
    services: [
      { title: 'Instalacion electrica', priceMin: 200, priceMax: 2000, priceUnit: 'proyecto' },
      { title: 'Revision de cuadro', priceMin: 80, priceMax: 150, priceUnit: 'servicio' },
      { title: 'Urgencias electricas', priceMin: 100, priceMax: 300, priceUnit: 'servicio' },
    ],
  },
  {
    businessName: 'Fontaneria Express',
    slug: 'fontaneria-express-madrid',
    description: 'Servicio rapido de fontaneria. Desatascos, reparaciones, instalaciones nuevas. Presupuesto sin compromiso.',
    contactName: 'Jose Martinez',
    contactEmail: 'jose@fontaneriaexpress.es',
    contactPhone: '+34 645 678 901',
    city: 'Madrid',
    province: 'Madrid',
    latitude: 40.44,
    longitude: -3.69,
    coverageRadiusKm: 20,
    tier: 'free' as const,
    averageRating: '4.4',
    totalReviews: 78,
    totalLeads: 189,
    responseTimeMinutes: 90,
    isVerified: false,
    categories: ['plumbing'] as ServiceCategory[],
    services: [
      { title: 'Desatasco', priceMin: 50, priceMax: 200, priceUnit: 'servicio' },
      { title: 'Reparacion de grifo', priceMin: 40, priceMax: 100, priceUnit: 'servicio' },
      { title: 'Instalacion sanitarios', priceMin: 150, priceMax: 500, priceUnit: 'proyecto' },
    ],
  },
  {
    businessName: 'Jardines del Sur',
    slug: 'jardines-sur-madrid',
    description: 'Diseno y mantenimiento de jardines. Paisajismo, riego automatico, poda y tratamientos fitosanitarios.',
    contactName: 'Ana Fernandez',
    contactEmail: 'info@jardinesdelsur.es',
    contactPhone: '+34 656 789 012',
    city: 'Madrid',
    province: 'Madrid',
    latitude: 40.35,
    longitude: -3.72,
    coverageRadiusKm: 35,
    tier: 'premium' as const,
    averageRating: '4.7',
    totalReviews: 56,
    totalLeads: 134,
    responseTimeMinutes: 120,
    isVerified: true,
    categories: ['garden'] as ServiceCategory[],
    services: [
      { title: 'Mantenimiento mensual', priceMin: 100, priceMax: 300, priceUnit: 'mes' },
      { title: 'Diseno de jardin', priceMin: 500, priceMax: 5000, priceUnit: 'proyecto' },
      { title: 'Instalacion de riego', priceMin: 300, priceMax: 2000, priceUnit: 'proyecto' },
    ],
  },
  // Barcelona providers
  {
    businessName: 'Pintors Barcelona',
    slug: 'pintors-barcelona',
    description: 'Professionals de la pintura a Barcelona. Treballs amb garantia i materials ecologics.',
    contactName: 'Joan Puig',
    contactEmail: 'info@pintorsbarcelona.cat',
    contactPhone: '+34 667 890 123',
    city: 'Barcelona',
    province: 'Barcelona',
    latitude: 41.39,
    longitude: 2.18,
    coverageRadiusKm: 25,
    tier: 'premium' as const,
    averageRating: '4.5',
    totalReviews: 92,
    totalLeads: 278,
    responseTimeMinutes: 60,
    isVerified: true,
    categories: ['painting'] as ServiceCategory[],
    services: [
      { title: 'Pintura decorativa', priceMin: 600, priceMax: 4000, priceUnit: 'proyecto' },
      { title: 'Pintura industrial', priceMin: 2000, priceMax: 10000, priceUnit: 'proyecto' },
    ],
  },
  {
    businessName: 'Reformes Totals BCN',
    slug: 'reformes-totals-bcn',
    description: 'Reformes integrals amb disseny personalitzat. Equip propi sense subcontractes.',
    contactName: 'Marc Soler',
    contactEmail: 'marc@reformestotals.cat',
    contactPhone: '+34 678 901 234',
    city: 'Barcelona',
    province: 'Barcelona',
    latitude: 41.40,
    longitude: 2.16,
    coverageRadiusKm: 30,
    tier: 'enterprise' as const,
    averageRating: '4.8',
    totalReviews: 145,
    totalLeads: 389,
    responseTimeMinutes: 45,
    isVerified: true,
    categories: ['renovation', 'general'] as ServiceCategory[],
    services: [
      { title: 'Reforma integral pis', priceMin: 20000, priceMax: 100000, priceUnit: 'proyecto' },
      { title: 'Reforma bany', priceMin: 4000, priceMax: 15000, priceUnit: 'proyecto' },
    ],
  },
];

async function seedMarketplace() {
  console.log('Starting marketplace seed...');

  try {
    // 1. Seed area centroids
    console.log('Seeding area centroids...');
    for (const centroid of CITY_CENTROIDS) {
      await db
        .insert(areaCentroids)
        .values({
          city: centroid.city,
          province: centroid.province,
          country: 'Espana',
          latitude: centroid.latitude.toString(),
          longitude: centroid.longitude.toString(),
          areaRadiusKm: '10',
          source: 'manual',
        })
        .onConflictDoNothing();
    }
    console.log(`Seeded ${CITY_CENTROIDS.length} area centroids`);

    // 2. Seed service providers
    console.log('Seeding service providers...');
    for (const providerData of SAMPLE_PROVIDERS) {
      // Check if provider already exists
      const existing = await db.query.serviceProviders.findFirst({
        where: (sp, { eq }) => eq(sp.slug, providerData.slug),
      });

      if (existing) {
        console.log(`  Skipping ${providerData.businessName} (already exists)`);
        continue;
      }

      // Create provider
      const [provider] = await db
        .insert(serviceProviders)
        .values({
          businessName: providerData.businessName,
          slug: providerData.slug,
          description: providerData.description,
          contactName: providerData.contactName,
          contactEmail: providerData.contactEmail,
          contactPhone: providerData.contactPhone,
          city: providerData.city,
          province: providerData.province,
          country: 'Espana',
          latitude: providerData.latitude.toString(),
          longitude: providerData.longitude.toString(),
          coverageRadiusKm: providerData.coverageRadiusKm,
          status: 'active',
          tier: providerData.tier,
          averageRating: providerData.averageRating,
          totalReviews: providerData.totalReviews,
          totalLeads: providerData.totalLeads,
          responseTimeMinutes: providerData.responseTimeMinutes,
          isVerified: providerData.isVerified,
          verifiedAt: providerData.isVerified ? new Date() : null,
        })
        .returning();

      console.log(`  Created provider: ${providerData.businessName}`);

      // Create services for provider
      for (const service of providerData.services) {
        const category = providerData.categories[0]; // Use first category for now
        await db.insert(providerServices).values({
          providerId: provider.id,
          category,
          title: service.title,
          priceMin: service.priceMin.toString(),
          priceMax: service.priceMax.toString(),
          priceUnit: service.priceUnit,
          isActive: true,
        });
      }
      console.log(`    Added ${providerData.services.length} services`);

      // Add sample reviews for verified providers
      if (providerData.isVerified && providerData.totalReviews > 0) {
        const sampleReviews = [
          { rating: 5, title: 'Excelente trabajo', content: 'Muy profesionales y puntuales. Recomendado.' },
          { rating: 4, title: 'Buen servicio', content: 'Trabajo bien hecho, aunque tardaron un poco mas de lo esperado.' },
          { rating: 5, title: 'Muy recomendable', content: 'Precio justo y resultado impecable.' },
        ];

        for (const review of sampleReviews.slice(0, Math.min(3, providerData.totalReviews))) {
          await db.insert(providerReviews).values({
            providerId: provider.id,
            rating: review.rating,
            title: review.title,
            content: review.content,
            authorName: 'Usuario verificado',
            isVerified: true,
            isPublished: true,
          });
        }
        console.log(`    Added sample reviews`);
      }
    }

    console.log('\nMarketplace seed completed successfully!');
    console.log(`- ${CITY_CENTROIDS.length} city centroids`);
    console.log(`- ${SAMPLE_PROVIDERS.length} service providers`);

  } catch (error) {
    console.error('Error seeding marketplace:', error);
    throw error;
  }
}

// Run if executed directly
seedMarketplace()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
