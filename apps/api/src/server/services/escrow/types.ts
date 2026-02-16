/**
 * Escrow System Types
 * Trust layer for property and service transactions
 */

export type EscrowStatus = 'pending' | 'funded' | 'released' | 'refunded' | 'disputed';

export type EscrowType = 'property_sale' | 'property_rent' | 'service_completion' | 'custom';

export interface EscrowCondition {
  type: EscrowType;
  description: string;
  deadline?: Date;
  verificationRequired?: boolean;
  verificationMethod?: 'document' | 'signature' | 'inspection' | 'manual';
}

export interface EscrowEvidence {
  documentUrls?: string[];
  verificationIds?: string[];
  signatures?: {
    partyId: string;
    signedAt: string;
    signatureUrl: string;
  }[];
  inspectionReport?: {
    inspectorId: string;
    date: string;
    passed: boolean;
    notes: string;
  };
}

export interface CreateEscrowParams {
  buyerId: string;
  sellerId: string;
  listingId?: string;
  serviceLeadId?: string;
  agentSessionId?: string;
  amount: number;
  currency?: string;
  type: EscrowType;
  conditions: EscrowCondition[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface FundEscrowParams {
  escrowId: string;
  paymentMethodId?: string;
  stripePaymentIntentId?: string;
}

export interface ReleaseEscrowParams {
  escrowId: string;
  releasedBy: string; // userId who authorizes release
  evidence?: Partial<EscrowEvidence>;
  notes?: string;
}

export interface RefundEscrowParams {
  escrowId: string;
  refundedBy: string;
  reason: string;
  partialAmount?: number; // For partial refunds
}

export interface DisputeEscrowParams {
  escrowId: string;
  disputedBy: string;
  reason: string;
  evidence?: Partial<EscrowEvidence>;
}

export interface EscrowDetails {
  id: string;
  status: EscrowStatus;
  buyer: {
    id: string;
    name?: string;
    email?: string;
  };
  seller: {
    id: string;
    name?: string;
    email?: string;
  };
  amount: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
  type: EscrowType;
  conditions: EscrowCondition[];
  conditionsMet: boolean;
  timeline: {
    createdAt: Date;
    fundedAt?: Date;
    releasedAt?: Date;
    refundedAt?: Date;
    disputedAt?: Date;
    expiresAt?: Date;
  };
  evidence?: EscrowEvidence;
  relatedEntities: {
    listingId?: string;
    serviceLeadId?: string;
    agentSessionId?: string;
  };
  stripeInfo?: {
    paymentIntentId?: string;
    transferId?: string;
  };
}

export interface EscrowSummary {
  total: number;
  byStatus: Record<EscrowStatus, number>;
  totalValue: number;
  pendingValue: number;
  releasedValue: number;
  disputedValue: number;
}

// Platform fee structure
// InmoAI orquesta; fondos gestionados via Stripe Treasury/Mangopay (partnership)
export const PLATFORM_FEES = {
  property_sale: 0.005, // 0.5% of sale price
  property_rent: 0.05, // 5% of first month rent
  service_completion: 0.10, // 10% of service cost
  custom: 0.05, // 5%
} as const;

// Escrow limits
export const ESCROW_LIMITS = {
  minAmount: 100, // EUR
  maxAmount: 10_000_000, // EUR
  maxDurationDays: 90,
  autoReleaseAfterDays: 14, // Auto-release if no dispute after seller delivers
} as const;
