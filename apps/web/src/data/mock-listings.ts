export interface MockListing {
  id: string;
  title: string;
  price: number;
  city: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  sqMeters: number;
  imageUrl: string;
  operationType: "sale" | "rent";
  propertyType: string;
  description: string;
  features: string[];
  yearBuilt: number;
  energyRating: string;
  latitude: number;
  longitude: number;
}

export const mockListings: MockListing[] = [
  {
    id: "demo-001",
    title: "Ático con terraza panorámica en Salamanca",
    price: 895000,
    city: "Madrid",
    neighborhood: "Salamanca",
    bedrooms: 3,
    bathrooms: 2,
    sqMeters: 142,
    imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
    operationType: "sale",
    propertyType: "apartment",
    description: "Espectacular ático con terraza de 40m² y vistas al Retiro. Reformado con materiales de primera calidad. Cocina abierta, suelos de roble, domótica integral.",
    features: ["Terraza", "Ascensor", "Garaje", "Trastero", "Aire acondicionado"],
    yearBuilt: 2018,
    energyRating: "B",
    latitude: 40.4250,
    longitude: -3.6830,
  },
  {
    id: "demo-002",
    title: "Piso moderno en Chamberí con garaje",
    price: 520000,
    city: "Madrid",
    neighborhood: "Chamberí",
    bedrooms: 2,
    bathrooms: 1,
    sqMeters: 95,
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop",
    operationType: "sale",
    propertyType: "apartment",
    description: "Piso reformado en finca clásica. Techos altos, mucha luz natural. Zona tranquila junto a Alonso Martínez.",
    features: ["Garaje", "Ascensor", "Calefacción central", "Balcón"],
    yearBuilt: 1965,
    energyRating: "D",
    latitude: 40.4310,
    longitude: -3.6980,
  },
  {
    id: "demo-003",
    title: "Chalet independiente en La Moraleja",
    price: 1850000,
    city: "Madrid",
    neighborhood: "La Moraleja",
    bedrooms: 5,
    bathrooms: 4,
    sqMeters: 380,
    imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop",
    operationType: "sale",
    propertyType: "house",
    description: "Chalet de lujo con piscina climatizada, jardín de 800m² y bodega. Acabados premium, domótica completa, seguridad 24h.",
    features: ["Piscina", "Jardín", "Garaje doble", "Bodega", "Gimnasio"],
    yearBuilt: 2021,
    energyRating: "A",
    latitude: 40.4920,
    longitude: -3.6520,
  },
  {
    id: "demo-004",
    title: "Estudio luminoso en Malasaña",
    price: 1200,
    city: "Madrid",
    neighborhood: "Malasaña",
    bedrooms: 1,
    bathrooms: 1,
    sqMeters: 45,
    imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
    operationType: "rent",
    propertyType: "studio",
    description: "Estudio completamente amueblado en el corazón de Malasaña. Ideal para profesionales. Electrodomésticos nuevos.",
    features: ["Amueblado", "Aire acondicionado", "Electrodomésticos"],
    yearBuilt: 2005,
    energyRating: "E",
    latitude: 40.4260,
    longitude: -3.7050,
  },
  {
    id: "demo-005",
    title: "Piso con vistas al mar en Barceloneta",
    price: 675000,
    city: "Barcelona",
    neighborhood: "Barceloneta",
    bedrooms: 3,
    bathrooms: 2,
    sqMeters: 110,
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop",
    operationType: "sale",
    propertyType: "apartment",
    description: "Piso en primera línea de playa con vistas al Mediterráneo. Reforma integral 2024. Cocina Santos, baños de diseño.",
    features: ["Vistas al mar", "Terraza", "Ascensor", "Aire acondicionado"],
    yearBuilt: 2024,
    energyRating: "A",
    latitude: 41.3780,
    longitude: 2.1890,
  },
  {
    id: "demo-006",
    title: "Loft industrial en Poblenou",
    price: 2100,
    city: "Barcelona",
    neighborhood: "Poblenou",
    bedrooms: 2,
    bathrooms: 1,
    sqMeters: 120,
    imageUrl: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop",
    operationType: "rent",
    propertyType: "loft",
    description: "Loft en antigua fábrica reconvertida. Techos de 4m, ladrillo visto, grandes ventanales. Zona 22@ tech district.",
    features: ["Diáfano", "Techos altos", "Amueblado", "Mascotas permitidas"],
    yearBuilt: 2019,
    energyRating: "C",
    latitude: 41.4030,
    longitude: 2.2010,
  },
  {
    id: "demo-007",
    title: "Adosado en Nervión con patio",
    price: 345000,
    city: "Sevilla",
    neighborhood: "Nervión",
    bedrooms: 4,
    bathrooms: 3,
    sqMeters: 180,
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
    operationType: "sale",
    propertyType: "townhouse",
    description: "Adosado de esquina con patio andaluz y solarium. Tres plantas, garaje privado. Cerca del estadio y centro comercial.",
    features: ["Patio", "Solarium", "Garaje", "Trastero", "Aire acondicionado"],
    yearBuilt: 2015,
    energyRating: "C",
    latitude: 37.3830,
    longitude: -5.9730,
  },
  {
    id: "demo-008",
    title: "Apartamento ejecutivo en AZCA",
    price: 1850,
    city: "Madrid",
    neighborhood: "AZCA",
    bedrooms: 2,
    bathrooms: 2,
    sqMeters: 85,
    imageUrl: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop",
    operationType: "rent",
    propertyType: "apartment",
    description: "Apartamento de diseño en zona financiera. Amueblado con gusto, portero 24h, gimnasio comunitario. Ideal expatriados.",
    features: ["Amueblado", "Portero 24h", "Gimnasio", "Piscina comunitaria"],
    yearBuilt: 2020,
    energyRating: "B",
    latitude: 40.4510,
    longitude: -3.6920,
  },
  {
    id: "demo-009",
    title: "Casa rural reformada en Sierra de Guadarrama",
    price: 425000,
    city: "Madrid",
    neighborhood: "Sierra de Guadarrama",
    bedrooms: 4,
    bathrooms: 3,
    sqMeters: 220,
    imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop",
    operationType: "sale",
    propertyType: "house",
    description: "Casa de piedra completamente restaurada con encanto rústico moderno. Chimenea, jardín con árboles frutales, vistas a la sierra.",
    features: ["Jardín", "Chimenea", "Garaje", "Barbacoa", "Vistas montaña"],
    yearBuilt: 1920,
    energyRating: "D",
    latitude: 40.7350,
    longitude: -4.0100,
  },
];

export function getMockRecentListings(city?: string, limit = 12, operationType?: "sale" | "rent") {
  let filtered = mockListings;

  if (city) {
    filtered = filtered.filter((l) => l.city.toLowerCase() === city.toLowerCase());
  }
  if (operationType) {
    filtered = filtered.filter((l) => l.operationType === operationType);
  }

  return filtered.slice(0, limit);
}

export function getMockListingById(id: string) {
  return mockListings.find((l) => l.id === id) ?? null;
}
