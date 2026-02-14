/**
 * Spanish Cadastre Integration Service
 *
 * Integrates with the official Spanish Cadastre (Catastro) API
 * to provide property verification and cadastral data.
 *
 * API Documentation: https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/
 *
 * This service provides:
 * - Cadastral reference lookup by address
 * - Property details by cadastral reference
 * - Owner verification (limited - requires official agreement)
 * - Cadastral value estimation
 */

import { XMLParser } from 'fast-xml-parser';

// Cadastre API endpoints (official, free)
const CADASTRE_API_BASE = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC';

// Types
export interface CadastralReference {
  pc1: string; // First 7 chars
  pc2: string; // Next 7 chars
  car: string; // Control char
  cc1: string; // Control 1
  cc2: string; // Control 2
  full: string; // Complete reference (20 chars)
}

export interface CadastralProperty {
  reference: string;
  address: {
    street: string;
    number: string;
    floor?: string;
    door?: string;
    postalCode: string;
    municipality: string;
    province: string;
  };
  surface: {
    built: number; // m²
    plot?: number; // m² (for houses with land)
  };
  use: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'other';
  constructionYear?: number;
  cadastralValue?: number; // Only if available
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface CadastralSearchResult {
  found: boolean;
  properties: CadastralProperty[];
  error?: string;
}

export interface CadastralVerification {
  verified: boolean;
  reference: string;
  property?: CadastralProperty;
  matchesAddress: boolean;
  verificationDate: Date;
  error?: string;
}

// XML Parser configuration
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

/**
 * Search cadastral reference by address
 *
 * @param province - Province name (e.g., "MADRID")
 * @param municipality - Municipality name (e.g., "MADRID")
 * @param street - Street type and name (e.g., "CL GRAN VIA")
 * @param number - Street number
 */
export async function searchByAddress(
  province: string,
  municipality: string,
  street: string,
  number: string
): Promise<CadastralSearchResult> {
  try {
    // Use ConsultaNumero endpoint which returns actual property data
    const url = new URL(`${CADASTRE_API_BASE}/OVCCallejero.asmx/ConsultaNumero`);
    url.searchParams.set('Provincia', province.toUpperCase());
    url.searchParams.set('Municipio', municipality.toUpperCase());
    url.searchParams.set('TipoVia', '');
    url.searchParams.set('NomVia', street.toUpperCase());
    url.searchParams.set('Numero', number);
    url.searchParams.set('Bloque', '');
    url.searchParams.set('Escalera', '');
    url.searchParams.set('Planta', '');
    url.searchParams.set('Puerta', '');

    const response = await fetch(url.toString());
    const xmlText = await response.text();
    const data = xmlParser.parse(xmlText);

    // Parse consulta_numerero response
    const results = parseConsultaNumeroResponse(data);

    return {
      found: results.length > 0,
      properties: results,
    };
  } catch (error) {
    return {
      found: false,
      properties: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse ConsultaNumero response - returns properties at specific address
 */
function parseConsultaNumeroResponse(data: unknown): CadastralProperty[] {
  const properties: CadastralProperty[] = [];

  try {
    const root = data as Record<string, unknown>;
    const consulta = root?.consulta_numerero as Record<string, unknown>;

    if (!consulta) return properties;

    // Check for errors
    const lerr = consulta?.lerr as Record<string, unknown>;
    if (lerr?.err) {
      return properties;
    }

    // Get property list from numerero.nump (not numer)
    const numerero = consulta?.numerero as Record<string, unknown>;
    if (!numerero) return properties;

    const nump = numerero?.nump;
    const items = Array.isArray(nump) ? nump : nump ? [nump] : [];

    for (const item of items) {
      const n = item as Record<string, unknown>;
      const pc = n?.pc as Record<string, unknown>;
      const num = n?.num as Record<string, unknown>;

      if (pc) {
        // Format pc1 to 7 chars (pad with leading zeros)
        const pc1 = String(pc?.pc1 || '').padStart(7, '0');
        const pc2 = String(pc?.pc2 || '');

        properties.push({
          reference: `${pc1}${pc2}`,
          address: {
            street: '',
            number: String(num?.pnp || ''),
            postalCode: '',
            municipality: '',
            province: '',
          },
          surface: { built: 0 },
          use: 'other',
        });
      }
    }
  } catch {
    // Silent fail
  }

  return properties;
}

/**
 * Get property details by cadastral reference
 *
 * @param cadastralRef - Full cadastral reference (20 characters)
 */
export async function getPropertyByReference(
  cadastralRef: string
): Promise<CadastralProperty | null> {
  try {
    // Validate cadastral reference format
    if (!isValidCadastralReference(cadastralRef)) {
      throw new Error('Invalid cadastral reference format');
    }

    const url = new URL(`${CADASTRE_API_BASE}/OVCCallejero.asmx/Consulta_DNPRC`);
    url.searchParams.set('Provincia', '');
    url.searchParams.set('Municipio', '');
    url.searchParams.set('RC', cadastralRef);

    const response = await fetch(url.toString());
    const xmlText = await response.text();
    const data = xmlParser.parse(xmlText);

    return parsePropertyDetails(data, cadastralRef);
  } catch (error) {
    console.error('Error fetching cadastral data:', error);
    return null;
  }
}

/**
 * Get cadastral reference from coordinates
 *
 * @param latitude - Latitude
 * @param longitude - Longitude
 */
export async function getReferenceByCoordenates(
  latitude: number,
  longitude: number
): Promise<CadastralSearchResult> {
  try {
    const url = new URL(`${CADASTRE_API_BASE}/OVCCoordenadas.asmx/Consulta_RCCOOR`);
    url.searchParams.set('SRS', 'EPSG:4326'); // WGS84
    url.searchParams.set('Coordenada_X', longitude.toString());
    url.searchParams.set('Coordenada_Y', latitude.toString());

    const response = await fetch(url.toString());
    const xmlText = await response.text();
    const data = xmlParser.parse(xmlText);

    const results = parseCadastreResponse(data);

    return {
      found: results.length > 0,
      properties: results,
    };
  } catch (error) {
    return {
      found: false,
      properties: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify a property's cadastral data against listing information
 *
 * @param listingAddress - Address from the listing
 * @param claimedReference - Cadastral reference claimed by seller
 */
export async function verifyProperty(
  listingAddress: {
    street: string;
    number: string;
    postalCode?: string;
    city: string;
    province: string;
  },
  claimedReference?: string
): Promise<CadastralVerification> {
  try {
    let property: CadastralProperty | null = null;

    // If reference provided, verify it directly
    if (claimedReference) {
      property = await getPropertyByReference(claimedReference);
    }

    // If no reference or not found, search by address
    if (!property) {
      const searchResult = await searchByAddress(
        listingAddress.province,
        listingAddress.city,
        listingAddress.street,
        listingAddress.number
      );

      if (searchResult.found && searchResult.properties.length > 0) {
        property = searchResult.properties[0];
      }
    }

    if (!property) {
      return {
        verified: false,
        reference: claimedReference || '',
        matchesAddress: false,
        verificationDate: new Date(),
        error: 'Property not found in Cadastre',
      };
    }

    // Verify address matches
    const addressMatches = compareAddresses(listingAddress, property.address);

    return {
      verified: true,
      reference: property.reference,
      property,
      matchesAddress: addressMatches,
      verificationDate: new Date(),
    };
  } catch (error) {
    return {
      verified: false,
      reference: claimedReference || '',
      matchesAddress: false,
      verificationDate: new Date(),
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// Helper functions

function isValidCadastralReference(ref: string): boolean {
  // Spanish cadastral references are 20 characters
  // Format: 14 alphanumeric + 4 alphanumeric + 2 control digits
  return /^[A-Z0-9]{20}$/i.test(ref.replace(/\s/g, ''));
}

function parseCadastreResponse(data: unknown): CadastralProperty[] {
  const properties: CadastralProperty[] = [];

  try {
    const root = data as Record<string, unknown>;

    // Handle consulta_dnp response (property lookup by reference)
    const consultaDnp = root?.consulta_dnp as Record<string, unknown>;
    if (consultaDnp) {
      // Check for errors
      const lerr = consultaDnp?.lerr as Record<string, unknown>;
      if (lerr?.err) {
        return properties; // Return empty on error
      }

      const bico = consultaDnp?.bico as Record<string, unknown>;
      if (bico) {
        const bi = bico?.bi as Record<string, unknown>;
        if (bi) {
          properties.push(extractPropertyFromBi(bi));
        }
      }
    }

    // Handle consulta_coordenadas response (coordinate lookup)
    const consultaCoor = root?.consulta_coordenadas as Record<string, unknown>;
    if (consultaCoor) {
      const coordenadas = consultaCoor?.coordenadas as Record<string, unknown>;
      if (coordenadas?.coord) {
        const coords = Array.isArray(coordenadas.coord)
          ? coordenadas.coord
          : [coordenadas.coord];

        for (const coord of coords) {
          const c = coord as Record<string, unknown>;
          const pc = c?.pc as Record<string, unknown>;
          if (pc) {
            properties.push({
              reference: `${pc?.pc1 || ''}${pc?.pc2 || ''}`,
              address: {
                street: '',
                number: '',
                postalCode: '',
                municipality: '',
                province: '',
              },
              surface: { built: 0 },
              use: 'other',
              coordinates: {
                latitude: parseFloat(String((c?.geo as Record<string, unknown>)?.xcen || 0)),
                longitude: parseFloat(String((c?.geo as Record<string, unknown>)?.ycen || 0)),
              },
            });
          }
        }
      }
    }

    // Handle consulta_callejero response (street lookup - just for validation)
    const consultaCallejero = root?.consulta_callejero as Record<string, unknown>;
    if (consultaCallejero?.callejero) {
      // Street found - API is working but this endpoint doesn't return properties
      // Properties require a different endpoint (ConsultaNumero or Consulta_DNPRC)
    }
  } catch {
    // Silent fail - return empty array
  }

  return properties;
}

function parsePropertyDetails(data: unknown, reference: string): CadastralProperty | null {
  try {
    const results = parseCadastreResponse(data);
    return results.find(p => p.reference === reference) || results[0] || null;
  } catch {
    return null;
  }
}

function extractPropertyFromBi(bi: Record<string, unknown>): CadastralProperty {
  const idbi = bi.idbi as Record<string, unknown> | undefined;
  const dt = bi.dt as Record<string, unknown> | undefined;
  const debi = bi.debi as Record<string, unknown> | undefined;
  const rc = idbi?.rc as Record<string, unknown> | undefined;

  return {
    reference: (rc?.pc1?.toString() ?? '') + (rc?.pc2?.toString() ?? ''),
    address: {
      street: (dt?.locs as Record<string, unknown>)?.lous?.toString() || '',
      number: (dt?.locs as Record<string, unknown>)?.lourb?.toString() || '',
      postalCode: (dt?.locs as Record<string, unknown>)?.dp?.toString() || '',
      municipality: (dt?.locs as Record<string, unknown>)?.nm?.toString() || '',
      province: (dt?.locs as Record<string, unknown>)?.np?.toString() || '',
    },
    surface: {
      built: parseInt((debi?.sfc as string) || '0', 10),
    },
    use: parseUseType((debi?.luso as string) || ''),
    constructionYear: parseInt((debi?.ant as string) || '0', 10) || undefined,
  };
}

function parseUseType(uso: string): CadastralProperty['use'] {
  const usoLower = uso.toLowerCase();
  if (usoLower.includes('residencial') || usoLower.includes('vivienda')) {
    return 'residential';
  }
  if (usoLower.includes('comercial') || usoLower.includes('oficina')) {
    return 'commercial';
  }
  if (usoLower.includes('industrial')) {
    return 'industrial';
  }
  if (usoLower.includes('agrario') || usoLower.includes('rústico')) {
    return 'agricultural';
  }
  return 'other';
}

function compareAddresses(
  listing: { street: string; number: string; postalCode?: string },
  cadastre: { street: string; number: string; postalCode: string }
): boolean {
  // Normalize and compare addresses
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/\s+/g, ' ')
      .trim();

  const listingStreet = normalize(listing.street);
  const cadastreStreet = normalize(cadastre.street);

  // Check if streets match (fuzzy)
  const streetMatch =
    listingStreet.includes(cadastreStreet) ||
    cadastreStreet.includes(listingStreet);

  // Check number
  const numberMatch = listing.number === cadastre.number;

  // Check postal code (skip if not provided)
  const postalMatch = !listing.postalCode || listing.postalCode === cadastre.postalCode;

  return streetMatch && numberMatch && postalMatch;
}

// Export service object
export const cadastreService = {
  searchByAddress,
  getPropertyByReference,
  getReferenceByCoordenates,
  verifyProperty,
  isValidCadastralReference,
};
