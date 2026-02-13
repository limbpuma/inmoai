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

// Portfolio images by category (using placeholder URLs - in production use real images)
function getPortfolioImagesForCategory(category: ServiceCategory) {
  const portfolioData: Record<ServiceCategory, Array<{ url: string; title: string; description: string; duration: string }>> = {
    painting: [
      { url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800', title: 'Salon moderno', description: 'Pintura decorativa en tonos neutros con acabado mate', duration: '3 dias' },
      { url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800', title: 'Dormitorio principal', description: 'Combinacion de colores relajantes para zona de descanso', duration: '2 dias' },
      { url: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800', title: 'Fachada exterior', description: 'Rehabilitacion completa de fachada con pintura impermeabilizante', duration: '5 dias' },
      { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', title: 'Cocina renovada', description: 'Pintura especial antihumedad para zona de cocina', duration: '2 dias' },
    ],
    renovation: [
      { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', title: 'Cocina integral', description: 'Reforma completa de cocina con isla central', duration: '3 semanas' },
      { url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800', title: 'Bano de diseno', description: 'Bano moderno con ducha de obra y muebles suspendidos', duration: '2 semanas' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', title: 'Salon abierto', description: 'Integracion salon-cocina con vigas vistas', duration: '1 mes' },
      { url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', title: 'Terraza cubierta', description: 'Cerramiento de terraza con sistema panoramico', duration: '10 dias' },
    ],
    electrical: [
      { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', title: 'Cuadro electrico', description: 'Instalacion de cuadro electrico con protecciones ICP', duration: '1 dia' },
      { url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800', title: 'Iluminacion LED', description: 'Sistema de iluminacion inteligente con control por app', duration: '3 dias' },
      { url: 'https://images.unsplash.com/photo-1558618047-f4b511ee370b?w=800', title: 'Punto de carga', description: 'Instalacion de punto de recarga para vehiculo electrico', duration: '1 dia' },
    ],
    plumbing: [
      { url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800', title: 'Bano completo', description: 'Instalacion completa de sanitarios y griferias', duration: '4 dias' },
      { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800', title: 'Cocina industrial', description: 'Fontaneria para cocina con sistema de osmosis', duration: '2 dias' },
      { url: 'https://images.unsplash.com/photo-1564540586988-aa4e53c3d799?w=800', title: 'Caldera nueva', description: 'Sustitucion de caldera antigua por sistema de condensacion', duration: '1 dia' },
    ],
    garden: [
      { url: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800', title: 'Jardin zen', description: 'Diseno de jardin minimalista con gravilla y plantas autoctonas', duration: '1 semana' },
      { url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800', title: 'Riego automatico', description: 'Sistema de riego por goteo con programador inteligente', duration: '3 dias' },
      { url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', title: 'Cesped artificial', description: 'Instalacion de cesped artificial de alta calidad', duration: '2 dias' },
      { url: 'https://images.unsplash.com/photo-1598902108854-10e335adac99?w=800', title: 'Piscina natural', description: 'Construccion de piscina biologica sin cloro', duration: '1 mes' },
    ],
    general: [
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', title: 'Reforma integral', description: 'Proyecto completo de reforma de vivienda', duration: '2 meses' },
      { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', title: 'Local comercial', description: 'Adecuacion de local para actividad comercial', duration: '1 mes' },
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', title: 'Oficina moderna', description: 'Diseno y ejecucion de espacio de trabajo colaborativo', duration: '3 semanas' },
    ],
  };

  return portfolioData[category] || portfolioData.general;
}

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
          {
            rating: 5,
            title: 'Excelente trabajo',
            content: 'Muy profesionales y puntuales. Llegaron a la hora acordada y dejaron todo impecable. El precio fue exactamente el del presupuesto, sin sorpresas. Totalmente recomendados.',
            authorName: 'Maria Garcia',
          },
          {
            rating: 4,
            title: 'Buen servicio',
            content: 'Trabajo bien hecho, aunque tardaron un poco mas de lo esperado por un problema con el material. La comunicacion fue buena y el resultado final muy satisfactorio.',
            authorName: 'Carlos Rodriguez',
          },
          {
            rating: 5,
            title: 'Muy recomendable',
            content: 'Precio justo y resultado impecable. Ya es la segunda vez que trabajo con ellos y repetiria sin dudar. Muy atentos a los detalles.',
            authorName: 'Ana Martinez',
          },
          {
            rating: 5,
            title: 'Profesionales de verdad',
            content: 'Desde el primer contacto hasta la finalizacion del trabajo, todo perfecto. Resolvieron un problema que otras empresas no supieron solucionar.',
            authorName: 'Jose Luis Fernandez',
          },
          {
            rating: 4,
            title: 'Calidad-precio excelente',
            content: 'Muy contento con el trabajo realizado. Quiza la comunicacion podria mejorar un poco, pero el resultado compensa con creces.',
            authorName: 'Laura Sanchez',
          },
        ];

        for (const review of sampleReviews.slice(0, Math.min(5, providerData.totalReviews))) {
          await db.insert(providerReviews).values({
            providerId: provider.id,
            rating: review.rating,
            title: review.title,
            content: review.content,
            authorName: review.authorName,
            isVerified: true,
            isPublished: true,
          });
        }
        console.log(`    Added sample reviews`);
      }

      // Add sample portfolio for premium/enterprise providers
      if (providerData.tier !== 'free') {
        const portfolioImages = getPortfolioImagesForCategory(providerData.categories[0]);
        for (let i = 0; i < portfolioImages.length; i++) {
          await db.insert(providerPortfolio).values({
            providerId: provider.id,
            category: providerData.categories[0],
            title: portfolioImages[i].title,
            description: portfolioImages[i].description,
            imageUrl: portfolioImages[i].url,
            thumbnailUrl: portfolioImages[i].url,
            position: i,
            projectDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            projectDuration: portfolioImages[i].duration,
            isPublished: true,
          });
        }
        console.log(`    Added ${portfolioImages.length} portfolio items`);
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
