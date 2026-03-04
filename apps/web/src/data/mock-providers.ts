export interface MockProviderService {
  id: string;
  category: string;
  title: string;
  priceMin: number;
}

export interface MockRankedProvider {
  provider: {
    id: string;
    businessName: string;
    slug: string;
    description: string;
    logoUrl: string | null;
    city: string;
    tier: "free" | "premium" | "enterprise";
    averageRating: number;
    totalReviews: number;
    responseTimeMinutes: number;
    isVerified: boolean;
  };
  services: MockProviderService[];
  distanceKm: number | null;
}

const mockProviders: MockRankedProvider[] = [
  {
    provider: {
      id: "prov-001",
      businessName: "Pinturas Garcia Madrid",
      slug: "pinturas-garcia-madrid",
      description: "Mas de 20 anos de experiencia en pintura decorativa e industrial. Especialistas en acabados de alta calidad para viviendas y locales comerciales.",
      logoUrl: null,
      city: "Madrid",
      tier: "premium",
      averageRating: 4.8,
      totalReviews: 127,
      responseTimeMinutes: 45,
      isVerified: true,
    },
    services: [
      { id: "svc-001a", category: "painting", title: "Pintura interior viviendas", priceMin: 800 },
      { id: "svc-001b", category: "painting", title: "Pintura de fachadas", priceMin: 2500 },
      { id: "svc-001c", category: "painting", title: "Lacado de puertas y muebles", priceMin: 350 },
    ],
    distanceKm: 3.2,
  },
  {
    provider: {
      id: "prov-002",
      businessName: "Reformas Integrales Lopez",
      slug: "reformas-integrales-lopez",
      description: "Empresa lider en reformas integrales de viviendas en Madrid. Cocinas, banos, salones y oficinas. Presupuesto sin compromiso y financiacion disponible.",
      logoUrl: null,
      city: "Madrid",
      tier: "enterprise",
      averageRating: 4.9,
      totalReviews: 243,
      responseTimeMinutes: 30,
      isVerified: true,
    },
    services: [
      { id: "svc-002a", category: "renovation", title: "Reforma integral vivienda", priceMin: 15000 },
      { id: "svc-002b", category: "renovation", title: "Reforma de cocina", priceMin: 5000 },
      { id: "svc-002c", category: "renovation", title: "Reforma de bano", priceMin: 3500 },
    ],
    distanceKm: 5.8,
  },
  {
    provider: {
      id: "prov-003",
      businessName: "ElectroHogar Madrid",
      slug: "electrohogar-madrid",
      description: "Instalaciones electricas profesionales. Boletines, cuadros electricos, iluminacion LED y domotica. Servicio rapido y garantizado.",
      logoUrl: null,
      city: "Madrid",
      tier: "free",
      averageRating: 4.5,
      totalReviews: 89,
      responseTimeMinutes: 60,
      isVerified: true,
    },
    services: [
      { id: "svc-003a", category: "electrical", title: "Instalacion electrica completa", priceMin: 2000 },
      { id: "svc-003b", category: "electrical", title: "Boletin electrico", priceMin: 150 },
      { id: "svc-003c", category: "electrical", title: "Instalacion domotica", priceMin: 1200 },
    ],
    distanceKm: 7.1,
  },
  {
    provider: {
      id: "prov-004",
      businessName: "Fontaneria Rapida 24h",
      slug: "fontaneria-rapida-24h",
      description: "Servicio de fontaneria urgente las 24 horas en Madrid y alrededores. Desatascos, fugas, calderas y aire acondicionado. Respuesta inmediata.",
      logoUrl: null,
      city: "Madrid",
      tier: "premium",
      averageRating: 4.6,
      totalReviews: 312,
      responseTimeMinutes: 20,
      isVerified: true,
    },
    services: [
      { id: "svc-004a", category: "plumbing", title: "Reparacion de urgencia", priceMin: 80 },
      { id: "svc-004b", category: "plumbing", title: "Instalacion de calderas", priceMin: 1500 },
      { id: "svc-004c", category: "plumbing", title: "Desatascos profesionales", priceMin: 120 },
    ],
    distanceKm: 2.4,
  },
  {
    provider: {
      id: "prov-005",
      businessName: "Jardines del Sur",
      slug: "jardines-del-sur",
      description: "Diseno y mantenimiento de jardines y terrazas en Sevilla. Sistemas de riego automatico, podas, cesped artificial y paisajismo mediterraneo.",
      logoUrl: null,
      city: "Sevilla",
      tier: "free",
      averageRating: 4.3,
      totalReviews: 56,
      responseTimeMinutes: 120,
      isVerified: false,
    },
    services: [
      { id: "svc-005a", category: "garden", title: "Diseno de jardines", priceMin: 500 },
      { id: "svc-005b", category: "garden", title: "Mantenimiento mensual", priceMin: 150 },
      { id: "svc-005c", category: "garden", title: "Instalacion riego automatico", priceMin: 800 },
    ],
    distanceKm: null,
  },
  {
    provider: {
      id: "prov-006",
      businessName: "Reformas Costa Sol",
      slug: "reformas-costa-sol",
      description: "Reformas de alta calidad en la Costa del Sol. Especialistas en viviendas vacacionales, apartamentos turisticos y villas de lujo.",
      logoUrl: null,
      city: "Malaga",
      tier: "premium",
      averageRating: 4.7,
      totalReviews: 168,
      responseTimeMinutes: 45,
      isVerified: true,
    },
    services: [
      { id: "svc-006a", category: "renovation", title: "Reforma apartamento turistico", priceMin: 8000 },
      { id: "svc-006b", category: "renovation", title: "Reforma villa completa", priceMin: 25000 },
      { id: "svc-006c", category: "painting", title: "Pintura y decoracion", priceMin: 1200 },
    ],
    distanceKm: null,
  },
  {
    provider: {
      id: "prov-007",
      businessName: "Barcelona Electric",
      slug: "barcelona-electric",
      description: "Electricistas profesionales en Barcelona. Certificaciones, automatizacion, paneles solares e instalaciones de puntos de recarga para vehiculos electricos.",
      logoUrl: null,
      city: "Barcelona",
      tier: "free",
      averageRating: 4.4,
      totalReviews: 73,
      responseTimeMinutes: 90,
      isVerified: true,
    },
    services: [
      { id: "svc-007a", category: "electrical", title: "Instalacion paneles solares", priceMin: 4000 },
      { id: "svc-007b", category: "electrical", title: "Punto de recarga EV", priceMin: 900 },
      { id: "svc-007c", category: "electrical", title: "Certificado electrico", priceMin: 120 },
    ],
    distanceKm: null,
  },
  {
    provider: {
      id: "prov-008",
      businessName: "Pinturas Mediterraneo",
      slug: "pinturas-mediterraneo",
      description: "Empresa familiar de pintura en Valencia con mas de 15 anos de experiencia. Especialistas en tecnicas decorativas, microcemento y papel pintado.",
      logoUrl: null,
      city: "Valencia",
      tier: "free",
      averageRating: 4.2,
      totalReviews: 41,
      responseTimeMinutes: 180,
      isVerified: false,
    },
    services: [
      { id: "svc-008a", category: "painting", title: "Pintura decorativa", priceMin: 600 },
      { id: "svc-008b", category: "painting", title: "Aplicacion microcemento", priceMin: 1800 },
    ],
    distanceKm: null,
  },
  {
    provider: {
      id: "prov-009",
      businessName: "MultiServicios Bilbao",
      slug: "multiservicios-bilbao",
      description: "Servicio integral de mantenimiento y reparaciones para comunidades de vecinos y particulares. Electricidad, fontaneria, pintura y pequenas reformas.",
      logoUrl: null,
      city: "Bilbao",
      tier: "premium",
      averageRating: 4.6,
      totalReviews: 95,
      responseTimeMinutes: 60,
      isVerified: true,
    },
    services: [
      { id: "svc-009a", category: "general", title: "Mantenimiento comunidades", priceMin: 200 },
      { id: "svc-009b", category: "plumbing", title: "Fontaneria general", priceMin: 80 },
      { id: "svc-009c", category: "electrical", title: "Reparaciones electricas", priceMin: 60 },
    ],
    distanceKm: null,
  },
  {
    provider: {
      id: "prov-010",
      businessName: "Fontaneria Express BCN",
      slug: "fontaneria-express-bcn",
      description: "Fontaneros profesionales en Barcelona. Urgencias 24h, instalacion de sanitarios, gas y calefaccion. Mas de 10 anos de experiencia.",
      logoUrl: null,
      city: "Barcelona",
      tier: "free",
      averageRating: 4.1,
      totalReviews: 64,
      responseTimeMinutes: 40,
      isVerified: true,
    },
    services: [
      { id: "svc-010a", category: "plumbing", title: "Urgencias fontaneria", priceMin: 90 },
      { id: "svc-010b", category: "plumbing", title: "Instalacion sanitarios", priceMin: 250 },
    ],
    distanceKm: null,
  },
  {
    provider: {
      id: "prov-011",
      businessName: "Renovaciones Premium Madrid",
      slug: "renovaciones-premium-madrid",
      description: "Reformas de lujo en Madrid. Arquitectura interior, diseno personalizado y ejecucion impecable. Trabajamos con los mejores materiales del mercado.",
      logoUrl: null,
      city: "Madrid",
      tier: "enterprise",
      averageRating: 4.8,
      totalReviews: 87,
      responseTimeMinutes: 120,
      isVerified: true,
    },
    services: [
      { id: "svc-011a", category: "renovation", title: "Reforma de lujo integral", priceMin: 30000 },
      { id: "svc-011b", category: "renovation", title: "Diseno de interiores", priceMin: 3000 },
      { id: "svc-011c", category: "renovation", title: "Proyecto de arquitectura", priceMin: 5000 },
    ],
    distanceKm: 8.5,
  },
  {
    provider: {
      id: "prov-012",
      businessName: "Jardines y Piscinas Costa",
      slug: "jardines-piscinas-costa",
      description: "Construccion y mantenimiento de piscinas y jardines en la Costa del Sol. Piscinas de obra, infinity pools, jardineria tropical y sistemas de riego.",
      logoUrl: null,
      city: "Marbella",
      tier: "premium",
      averageRating: 4.5,
      totalReviews: 112,
      responseTimeMinutes: 60,
      isVerified: true,
    },
    services: [
      { id: "svc-012a", category: "garden", title: "Construccion de piscinas", priceMin: 12000 },
      { id: "svc-012b", category: "garden", title: "Jardineria y paisajismo", priceMin: 800 },
      { id: "svc-012c", category: "garden", title: "Mantenimiento de piscinas", priceMin: 100 },
    ],
    distanceKm: null,
  },
];

// Extended detail data for each provider (used by /servicios/[slug])
const providerDetails: Record<string, {
  address: string;
  province: string;
  contactPhone: string;
  contactEmail: string;
  website: string | null;
  coverageRadiusKm: number;
  totalLeads: number;
  latitude: number;
  longitude: number;
}> = {
  "prov-001": { address: "Calle Alcala 123", province: "Madrid", contactPhone: "+34 912 345 678", contactEmail: "info@pinturasgarcia.es", website: "https://pinturasgarcia.es", coverageRadiusKm: 30, totalLeads: 342, latitude: 40.4168, longitude: -3.7038 },
  "prov-002": { address: "Avenida de America 45", province: "Madrid", contactPhone: "+34 913 456 789", contactEmail: "reformas@lopezsl.com", website: "https://reformaslopez.com", coverageRadiusKm: 40, totalLeads: 518, latitude: 40.4378, longitude: -3.6795 },
  "prov-003": { address: "Calle Gran Via 78", province: "Madrid", contactPhone: "+34 914 567 890", contactEmail: "contacto@electrohogar.es", website: null, coverageRadiusKm: 25, totalLeads: 156, latitude: 40.4200, longitude: -3.7025 },
  "prov-004": { address: "Calle Bravo Murillo 200", province: "Madrid", contactPhone: "+34 900 123 456", contactEmail: "urgencias@fontaneriarapida.es", website: "https://fontaneriarapida24h.es", coverageRadiusKm: 50, totalLeads: 890, latitude: 40.4512, longitude: -3.7032 },
  "prov-005": { address: "Avenida de la Constitucion 10", province: "Sevilla", contactPhone: "+34 954 123 456", contactEmail: "hola@jardinesdelsur.es", website: null, coverageRadiusKm: 20, totalLeads: 78, latitude: 37.3891, longitude: -5.9845 },
  "prov-006": { address: "Paseo Maritimo 55", province: "Malaga", contactPhone: "+34 952 234 567", contactEmail: "info@reformascostasol.com", website: "https://reformascostasol.com", coverageRadiusKm: 35, totalLeads: 267, latitude: 36.7213, longitude: -4.4214 },
  "prov-007": { address: "Carrer de Valencia 180", province: "Barcelona", contactPhone: "+34 933 456 789", contactEmail: "info@barcelonaelectric.cat", website: "https://barcelonaelectric.cat", coverageRadiusKm: 25, totalLeads: 134, latitude: 41.3874, longitude: 2.1686 },
  "prov-008": { address: "Calle Colon 32", province: "Valencia", contactPhone: "+34 963 123 456", contactEmail: "contacto@pinturasmediterraneo.es", website: null, coverageRadiusKm: 15, totalLeads: 62, latitude: 39.4699, longitude: -0.3763 },
  "prov-009": { address: "Gran Via de Don Diego Lopez de Haro 25", province: "Bizkaia", contactPhone: "+34 944 567 890", contactEmail: "info@multiservicios-bilbao.com", website: "https://multiservicios-bilbao.com", coverageRadiusKm: 30, totalLeads: 198, latitude: 43.2630, longitude: -2.9350 },
  "prov-010": { address: "Carrer de Balmes 95", province: "Barcelona", contactPhone: "+34 932 345 678", contactEmail: "urgencias@fontaneriaexpressbcn.com", website: null, coverageRadiusKm: 20, totalLeads: 112, latitude: 41.3930, longitude: 2.1530 },
  "prov-011": { address: "Paseo de la Castellana 89", province: "Madrid", contactPhone: "+34 915 678 901", contactEmail: "proyectos@renovacionespremium.es", website: "https://renovacionespremium.es", coverageRadiusKm: 45, totalLeads: 145, latitude: 40.4350, longitude: -3.6900 },
  "prov-012": { address: "Avenida Ricardo Soriano 12", province: "Malaga", contactPhone: "+34 951 345 678", contactEmail: "info@jardinespiscinas.com", website: "https://jardinespiscinas.com", coverageRadiusKm: 40, totalLeads: 203, latitude: 36.5100, longitude: -4.8860 },
};

// Service descriptions and price details for detail page
const serviceDetails: Record<string, { description: string; priceMax: number | null; priceUnit: string }> = {
  "svc-001a": { description: "Pintura completa de interiores incluyendo preparacion de superficies y acabado", priceMax: 3000, priceUnit: "vivienda" },
  "svc-001b": { description: "Pintura de fachadas con andamios incluidos, tratamientos impermeabilizantes", priceMax: 8000, priceUnit: "fachada" },
  "svc-001c": { description: "Lacado profesional de puertas, marcos y muebles de madera", priceMax: 1200, priceUnit: "unidad" },
  "svc-002a": { description: "Reforma integral de vivienda incluyendo albanileria, fontaneria, electricidad y acabados", priceMax: 60000, priceUnit: "proyecto" },
  "svc-002b": { description: "Reforma completa de cocina con diseno 3D, mobiliario y electrodomesticos", priceMax: 18000, priceUnit: "cocina" },
  "svc-002c": { description: "Reforma de bano completa con plato de ducha, sanitarios y alicatado", priceMax: 8000, priceUnit: "bano" },
  "svc-003a": { description: "Instalacion electrica completa en vivienda nueva o reforma", priceMax: 6000, priceUnit: "vivienda" },
  "svc-003b": { description: "Certificado de instalacion electrica para alta de suministro o cambio de potencia", priceMax: null, priceUnit: "certificado" },
  "svc-003c": { description: "Instalacion de sistema domotico completo con control por app", priceMax: 5000, priceUnit: "vivienda" },
  "svc-004a": { description: "Servicio de urgencia para fugas, atascos y averias. Desplazamiento en menos de 1 hora", priceMax: 300, priceUnit: "servicio" },
  "svc-004b": { description: "Instalacion y puesta en marcha de calderas de condensacion", priceMax: 4000, priceUnit: "instalacion" },
  "svc-004c": { description: "Desatascos con equipos profesionales de alta presion", priceMax: 500, priceUnit: "servicio" },
  "svc-005a": { description: "Diseno paisajistico personalizado con planos y seleccion de especies", priceMax: 3000, priceUnit: "proyecto" },
  "svc-005b": { description: "Mantenimiento integral mensual: poda, riego, tratamientos fitosanitarios", priceMax: 400, priceUnit: "mes" },
  "svc-005c": { description: "Instalacion de sistema de riego automatico por goteo o aspersion", priceMax: 2500, priceUnit: "jardin" },
  "svc-006a": { description: "Reforma completa de apartamento para alquiler turistico con licencia", priceMax: 20000, priceUnit: "apartamento" },
  "svc-006b": { description: "Reforma integral de villa incluyendo piscina, jardin y exteriores", priceMax: 80000, priceUnit: "proyecto" },
  "svc-006c": { description: "Servicio de pintura y decoracion de interiores con asesoria de color", priceMax: 4000, priceUnit: "vivienda" },
  "svc-007a": { description: "Instalacion de paneles solares fotovoltaicos con gestion de subvenciones", priceMax: 12000, priceUnit: "instalacion" },
  "svc-007b": { description: "Punto de recarga para vehiculo electrico con instalacion homologada", priceMax: 2500, priceUnit: "punto" },
  "svc-007c": { description: "Certificado de instalacion electrica CIE/BIE obligatorio", priceMax: null, priceUnit: "certificado" },
  "svc-008a": { description: "Pintura con tecnicas decorativas: esponjado, estucado, efecto madera", priceMax: 2000, priceUnit: "habitacion" },
  "svc-008b": { description: "Aplicacion de microcemento en suelos, paredes y banos", priceMax: 5000, priceUnit: "proyecto" },
  "svc-009a": { description: "Contrato de mantenimiento integral para comunidades de propietarios", priceMax: 600, priceUnit: "mes" },
  "svc-009b": { description: "Servicio general de fontaneria: reparaciones, cambio de grifos, cisternas", priceMax: 300, priceUnit: "servicio" },
  "svc-009c": { description: "Reparacion de averias electricas, cambio de enchufes y mecanismos", priceMax: 200, priceUnit: "servicio" },
  "svc-010a": { description: "Urgencias 24h: fugas, atascos, roturas de tuberias", priceMax: 350, priceUnit: "servicio" },
  "svc-010b": { description: "Instalacion y cambio de sanitarios, inodoros, lavabos y duchas", priceMax: 800, priceUnit: "instalacion" },
  "svc-011a": { description: "Reforma de lujo integral con materiales premium y diseno exclusivo", priceMax: 120000, priceUnit: "proyecto" },
  "svc-011b": { description: "Proyecto completo de diseno de interiores con renders 3D y direccion de obra", priceMax: 10000, priceUnit: "proyecto" },
  "svc-011c": { description: "Proyecto de arquitectura interior con tramitacion de licencias", priceMax: 15000, priceUnit: "proyecto" },
  "svc-012a": { description: "Construccion de piscina de obra: vaso, depuradora, iluminacion y acabados", priceMax: 35000, priceUnit: "piscina" },
  "svc-012b": { description: "Diseno y ejecucion de jardines tropicales y mediterraneos", priceMax: 5000, priceUnit: "jardin" },
  "svc-012c": { description: "Mantenimiento semanal de piscina: quimica, limpieza y revision de equipos", priceMax: 250, priceUnit: "mes" },
};

export function getMockProviderBySlug(slug: string) {
  const ranked = mockProviders.find((p) => p.provider.slug === slug);
  if (!ranked) return null;

  const details = providerDetails[ranked.provider.id] || {
    address: "", province: "", contactPhone: "", contactEmail: "",
    website: null, coverageRadiusKm: 25, totalLeads: 0, latitude: 0, longitude: 0,
  };

  return {
    ...ranked.provider,
    ...details,
    services: ranked.services.map((s) => {
      const detail = serviceDetails[s.id];
      return {
        ...s,
        description: detail?.description || "",
        priceMax: detail?.priceMax ?? null,
        priceUnit: detail?.priceUnit || "proyecto",
        isActive: true,
      };
    }),
    portfolio: [],
  };
}

export function getMockProviders(
  city?: string,
  categories?: string[],
  limit = 20
): { providers: MockRankedProvider[] } {
  let filtered = mockProviders;

  if (city) {
    filtered = filtered.filter(
      (p) => p.provider.city.toLowerCase() === city.toLowerCase()
    );
  }

  if (categories && categories.length > 0) {
    filtered = filtered.filter((p) =>
      p.services.some((s) => categories.includes(s.category))
    );
  }

  return { providers: filtered.slice(0, limit) };
}
