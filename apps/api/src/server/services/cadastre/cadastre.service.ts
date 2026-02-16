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
 * - Surface discrepancy detection (listing vs cadastral)
 */

import { XMLParser } from 'fast-xml-parser';

// ============================================================================
// CACHING - LRU Cache con TTL para evitar rate limits del Catastro
// ============================================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas - datos catastrales cambian poco
const CACHE_MAX_SIZE = 500;

const propertyCache = new Map<string, CacheEntry<CadastralProperty>>();
const searchCache = new Map<string, CacheEntry<CadastralSearchResult>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  // LRU: eliminar entrada mas antigua si excede tamanio
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// FETCH ROBUSTO - Timeout + Retry con exponential backoff
// ============================================================================
const FETCH_TIMEOUT_MS = 10000; // 10 segundos
const MAX_RETRIES = 3;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0 && !(error instanceof Error && error.name === 'AbortError')) {
      const delay = Math.pow(2, MAX_RETRIES - retries) * 500; // 500ms, 1s, 2s
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

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

// ============================================================================
// DISCREPANCIA DE SUPERFICIE - Deteccion de fraude/errores
// ============================================================================
export interface SurfaceDiscrepancy {
  hasMajorDiscrepancy: boolean;
  listingSurface: number;
  cadastralSurface: number;
  differenceM2: number;
  differencePercent: number;
  severity: 'none' | 'minor' | 'significant' | 'critical';
  warning?: string;
}

export function detectSurfaceDiscrepancy(
  listingSurfaceM2: number,
  cadastralSurfaceM2: number
): SurfaceDiscrepancy {
  const diff = listingSurfaceM2 - cadastralSurfaceM2;
  const diffPercent = cadastralSurfaceM2 > 0
    ? (diff / cadastralSurfaceM2) * 100
    : 0;
  const absDiffPercent = Math.abs(diffPercent);

  let severity: SurfaceDiscrepancy['severity'] = 'none';
  let warning: string | undefined;

  if (absDiffPercent > 20) {
    severity = 'critical';
    warning = `Discrepancia critica: ${Math.abs(diff).toFixed(0)}m2 (${absDiffPercent.toFixed(1)}%) entre superficie anunciada y catastral. Posible fraude o error grave.`;
  } else if (absDiffPercent > 10) {
    severity = 'significant';
    warning = `Discrepancia significativa: ${Math.abs(diff).toFixed(0)}m2. Verificar con vendedor.`;
  } else if (absDiffPercent > 5) {
    severity = 'minor';
    warning = `Discrepancia menor: diferencia de ${Math.abs(diff).toFixed(0)}m2.`;
  }

  return {
    hasMajorDiscrepancy: severity === 'critical' || severity === 'significant',
    listingSurface: listingSurfaceM2,
    cadastralSurface: cadastralSurfaceM2,
    differenceM2: diff,
    differencePercent: diffPercent,
    severity,
    warning,
  };
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
  // Cache key basado en parametros normalizados
  const cacheKey = `search:${province.toUpperCase()}:${municipality.toUpperCase()}:${street.toUpperCase()}:${number}`;
  const cached = getCached(searchCache, cacheKey);
  if (cached) return cached;

  try {
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

    const xmlText = await fetchWithRetry(url.toString());
    const data = xmlParser.parse(xmlText);
    const results = parseConsultaNumeroResponse(data);

    const result: CadastralSearchResult = {
      found: results.length > 0,
      properties: results,
    };

    setCache(searchCache, cacheKey, result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    // Log estructurado para monitoring
    logCadastreError('searchByAddress', { province, municipality, street, number }, errorMsg);
    return {
      found: false,
      properties: [],
      error: errorMsg,
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
  const normalizedRef = cadastralRef.replace(/\s/g, '').toUpperCase();

  // Check cache primero
  const cached = getCached(propertyCache, normalizedRef);
  if (cached) return cached;

  try {
    if (!isValidCadastralReference(normalizedRef)) {
      throw new Error('Invalid cadastral reference format');
    }

    const url = new URL(`${CADASTRE_API_BASE}/OVCCallejero.asmx/Consulta_DNPRC`);
    url.searchParams.set('Provincia', '');
    url.searchParams.set('Municipio', '');
    url.searchParams.set('RC', normalizedRef);

    const xmlText = await fetchWithRetry(url.toString());
    const data = xmlParser.parse(xmlText);
    const property = parsePropertyDetails(data, normalizedRef);

    if (property) {
      setCache(propertyCache, normalizedRef, property);
    }
    return property;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logCadastreError('getPropertyByReference', { cadastralRef: normalizedRef }, errorMsg);
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

// ============================================================================
// LOGGING ESTRUCTURADO
// ============================================================================
function logCadastreError(
  operation: string,
  params: Record<string, unknown>,
  error: string
): void {
  // Logging estructurado para monitoring (Datadog, CloudWatch, etc.)
  const logEntry = {
    service: 'cadastre',
    operation,
    params,
    error,
    timestamp: new Date().toISOString(),
  };
  // En produccion esto iria a un sistema de logging externo
  if (process.env.NODE_ENV !== 'test') {
    process.stderr.write(JSON.stringify(logEntry) + '\n');
  }
}

// ============================================================================
// VERIFICACION CRUZADA CON LISTING
// ============================================================================
export interface CrossVerificationResult extends CadastralVerification {
  surfaceDiscrepancy?: SurfaceDiscrepancy;
  yearDiscrepancy?: {
    listingYear?: number;
    cadastralYear?: number;
    matches: boolean;
  };
  riskScore: number; // 0-100, donde 100 = alto riesgo de fraude
  riskFactors: string[];
}

export async function crossVerifyWithListing(
  listingData: {
    address: {
      street: string;
      number: string;
      postalCode?: string;
      city: string;
      province: string;
    };
    surfaceM2?: number;
    constructionYear?: number;
    cadastralReference?: string;
  }
): Promise<CrossVerificationResult> {
  const baseVerification = await verifyProperty(
    listingData.address,
    listingData.cadastralReference
  );

  const riskFactors: string[] = [];
  let riskScore = 0;

  // Surface discrepancy check
  let surfaceDiscrepancy: SurfaceDiscrepancy | undefined;
  if (listingData.surfaceM2 && baseVerification.property?.surface.built) {
    surfaceDiscrepancy = detectSurfaceDiscrepancy(
      listingData.surfaceM2,
      baseVerification.property.surface.built
    );
    if (surfaceDiscrepancy.severity === 'critical') {
      riskScore += 40;
      riskFactors.push(surfaceDiscrepancy.warning || 'Discrepancia critica de superficie');
    } else if (surfaceDiscrepancy.severity === 'significant') {
      riskScore += 20;
      riskFactors.push(surfaceDiscrepancy.warning || 'Discrepancia significativa');
    }
  }

  // Year discrepancy check
  let yearDiscrepancy: CrossVerificationResult['yearDiscrepancy'];
  if (listingData.constructionYear && baseVerification.property?.constructionYear) {
    const matches = Math.abs(listingData.constructionYear - baseVerification.property.constructionYear) <= 2;
    yearDiscrepancy = {
      listingYear: listingData.constructionYear,
      cadastralYear: baseVerification.property.constructionYear,
      matches,
    };
    if (!matches) {
      riskScore += 15;
      riskFactors.push(`Anno construccion no coincide: anuncio ${listingData.constructionYear}, catastro ${baseVerification.property.constructionYear}`);
    }
  }

  // Address mismatch
  if (!baseVerification.matchesAddress) {
    riskScore += 25;
    riskFactors.push('Direccion del anuncio no coincide con Catastro');
  }

  // Property not found
  if (!baseVerification.verified) {
    riskScore += 30;
    riskFactors.push('Propiedad no encontrada en Catastro');
  }

  return {
    ...baseVerification,
    surfaceDiscrepancy,
    yearDiscrepancy,
    riskScore: Math.min(riskScore, 100),
    riskFactors,
  };
}

// ============================================================================
// CACHE STATS (para monitoring)
// ============================================================================
export function getCacheStats(): { properties: number; searches: number } {
  return {
    properties: propertyCache.size,
    searches: searchCache.size,
  };
}

export function clearCache(): void {
  propertyCache.clear();
  searchCache.clear();
}

// Export service object
export const cadastreService = {
  searchByAddress,
  getPropertyByReference,
  getReferenceByCoordenates,
  verifyProperty,
  crossVerifyWithListing,
  detectSurfaceDiscrepancy,
  isValidCadastralReference,
  getCacheStats,
  clearCache,
};
