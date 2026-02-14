/**
 * Property Verification Service
 *
 * KEY DIFFERENTIATOR: This service provides official property verification
 * that AI agents CANNOT get elsewhere. It links Spanish Cadastre data
 * with listing information to detect fraud and verify authenticity.
 *
 * Features:
 * - Automatic cadastral reference lookup
 * - Surface area verification (detect inflated m²)
 * - Construction year verification
 * - Property use verification (residential vs commercial)
 * - Mismatch detection with severity levels
 */

import { db } from '@/server/infrastructure/database';
import { listings } from '@/server/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { cadastreService, type CadastralProperty } from '../cadastre/cadastre.service';

export interface VerificationResult {
  verified: boolean;
  listingId: string;
  cadastralRef: string | null;
  property: CadastralProperty | null;
  mismatches: Mismatch[];
  trustScore: number; // 0-100
  verifiedAt: Date;
  error?: string;
}

export interface Mismatch {
  field: string;
  listingValue: string | number | null;
  cadastreValue: string | number | null;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Verify a listing against the Spanish Cadastre
 * This is the core differentiator that makes InmoAI indispensable
 */
export async function verifyListing(listingId: string): Promise<VerificationResult> {
  try {
    // Get listing from database
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return {
        verified: false,
        listingId,
        cadastralRef: null,
        property: null,
        mismatches: [],
        trustScore: 0,
        verifiedAt: new Date(),
        error: 'Listing not found',
      };
    }

    // Try to verify with existing cadastral reference
    if (listing.cadastralRef) {
      const property = await cadastreService.getPropertyByReference(listing.cadastralRef);
      if (property) {
        const mismatches = detectMismatches(listing, property);
        const trustScore = calculateTrustScore(mismatches, true);

        // Update listing with verification results
        await updateListingVerification(listingId, property, mismatches, trustScore);

        return {
          verified: true,
          listingId,
          cadastralRef: property.reference,
          property,
          mismatches,
          trustScore,
          verifiedAt: new Date(),
        };
      }
    }

    // Try to find by address
    if (listing.address && listing.city && listing.province) {
      const verification = await cadastreService.verifyProperty({
        street: listing.address,
        number: extractStreetNumber(listing.address),
        city: listing.city,
        province: listing.province,
        postalCode: listing.postalCode ?? undefined,
      });

      if (verification.verified && verification.property) {
        const mismatches = detectMismatches(listing, verification.property);
        const trustScore = calculateTrustScore(mismatches, true);

        // Update listing with verification results
        await updateListingVerification(
          listingId,
          verification.property,
          mismatches,
          trustScore
        );

        return {
          verified: true,
          listingId,
          cadastralRef: verification.property.reference,
          property: verification.property,
          mismatches,
          trustScore,
          verifiedAt: new Date(),
        };
      }
    }

    // Try to find by coordinates
    if (listing.latitude && listing.longitude) {
      const result = await cadastreService.getReferenceByCoordenates(
        parseFloat(listing.latitude),
        parseFloat(listing.longitude)
      );

      if (result.found && result.properties.length > 0) {
        const property = result.properties[0];
        const mismatches = detectMismatches(listing, property);
        const trustScore = calculateTrustScore(mismatches, true);

        // Update listing with verification results
        await updateListingVerification(listingId, property, mismatches, trustScore);

        return {
          verified: true,
          listingId,
          cadastralRef: property.reference,
          property,
          mismatches,
          trustScore,
          verifiedAt: new Date(),
        };
      }
    }

    // Could not verify
    return {
      verified: false,
      listingId,
      cadastralRef: null,
      property: null,
      mismatches: [],
      trustScore: 30, // Low base score for unverified
      verifiedAt: new Date(),
      error: 'Could not find property in Cadastre',
    };
  } catch (error) {
    return {
      verified: false,
      listingId,
      cadastralRef: null,
      property: null,
      mismatches: [],
      trustScore: 0,
      verifiedAt: new Date(),
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Detect mismatches between listing data and Cadastre data
 */
function detectMismatches(
  listing: typeof listings.$inferSelect,
  cadastre: CadastralProperty
): Mismatch[] {
  const mismatches: Mismatch[] = [];

  // Surface area mismatch (critical for fraud detection)
  if (listing.sizeSqm && cadastre.surface.built) {
    const difference = Math.abs(listing.sizeSqm - cadastre.surface.built);
    const percentDiff = (difference / cadastre.surface.built) * 100;

    if (percentDiff > 5) {
      mismatches.push({
        field: 'surface',
        listingValue: listing.sizeSqm,
        cadastreValue: cadastre.surface.built,
        severity: percentDiff > 20 ? 'high' : percentDiff > 10 ? 'medium' : 'low',
        description: `Listing claims ${listing.sizeSqm}m² but Cadastre shows ${cadastre.surface.built}m² (${percentDiff.toFixed(1)}% difference)`,
      });
    }
  }

  // Construction year mismatch
  if (listing.yearBuilt && cadastre.constructionYear) {
    if (listing.yearBuilt !== cadastre.constructionYear) {
      const diff = Math.abs(listing.yearBuilt - cadastre.constructionYear);
      mismatches.push({
        field: 'yearBuilt',
        listingValue: listing.yearBuilt,
        cadastreValue: cadastre.constructionYear,
        severity: diff > 10 ? 'medium' : 'low',
        description: `Listing shows year ${listing.yearBuilt} but Cadastre shows ${cadastre.constructionYear}`,
      });
    }
  }

  // Property type mismatch
  const listingUse = mapPropertyTypeToUse(listing.propertyType);
  if (listingUse && cadastre.use && listingUse !== cadastre.use) {
    mismatches.push({
      field: 'use',
      listingValue: listing.propertyType,
      cadastreValue: cadastre.use,
      severity: 'high',
      description: `Listing type ${listing.propertyType} doesn't match Cadastre use: ${cadastre.use}`,
    });
  }

  // Address mismatch (verify location)
  if (listing.address && cadastre.address.street) {
    const listingNorm = normalizeAddress(listing.address);
    const cadastreNorm = normalizeAddress(cadastre.address.street + ' ' + cadastre.address.number);

    if (!listingNorm.includes(cadastreNorm) && !cadastreNorm.includes(listingNorm)) {
      mismatches.push({
        field: 'address',
        listingValue: listing.address,
        cadastreValue: `${cadastre.address.street} ${cadastre.address.number}`,
        severity: 'medium',
        description: 'Address in listing may not match Cadastre records',
      });
    }
  }

  return mismatches;
}

/**
 * Calculate trust score based on verification results
 */
function calculateTrustScore(mismatches: Mismatch[], verified: boolean): number {
  if (!verified) return 30;

  let score = 100;

  for (const mismatch of mismatches) {
    switch (mismatch.severity) {
      case 'high':
        score -= 25;
        break;
      case 'medium':
        score -= 15;
        break;
      case 'low':
        score -= 5;
        break;
    }
  }

  return Math.max(0, score);
}

/**
 * Update listing with verification results
 */
async function updateListingVerification(
  listingId: string,
  property: CadastralProperty,
  mismatches: Mismatch[],
  trustScore: number
): Promise<void> {
  const hasMismatches = mismatches.length > 0;
  const highestSeverity = mismatches.reduce<'low' | 'medium' | 'high'>(
    (max, m) => {
      if (m.severity === 'high') return 'high';
      if (m.severity === 'medium' && max !== 'high') return 'medium';
      return max;
    },
    'low'
  );

  await db
    .update(listings)
    .set({
      cadastralRef: property.reference,
      cadastralVerified: true,
      cadastralVerifiedAt: new Date(),
      cadastralSurface: property.surface.built,
      cadastralUse: property.use,
      cadastralConstructionYear: property.constructionYear,
      cadastralMismatch: hasMismatches
        ? {
            fields: mismatches.map((m) => m.field),
            details: mismatches.map((m) => m.description).join('; '),
            severity: highestSeverity,
          }
        : null,
      // Update authenticity score based on trust
      authenticityScore: trustScore,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId));
}

// Helper functions

function extractStreetNumber(address: string): string {
  const match = address.match(/\d+/);
  return match ? match[0] : '';
}

function mapPropertyTypeToUse(
  propertyType: string
): CadastralProperty['use'] | null {
  const residential = ['piso', 'apartamento', 'casa', 'chalet', 'duplex', 'atico', 'estudio'];
  const commercial = ['local', 'oficina', 'nave'];
  const industrial = ['nave_industrial', 'almacen'];
  const agricultural = ['finca', 'terreno_rustico'];

  const type = propertyType.toLowerCase();

  if (residential.some((r) => type.includes(r))) return 'residential';
  if (commercial.some((c) => type.includes(c))) return 'commercial';
  if (industrial.some((i) => type.includes(i))) return 'industrial';
  if (agricultural.some((a) => type.includes(a))) return 'agricultural';

  return null;
}

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();
}

// Export service
export const verificationService = {
  verifyListing,
  detectMismatches,
  calculateTrustScore,
};
