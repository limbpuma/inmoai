/**
 * Escrow Service - Public API
 */

export { escrowService } from './escrow.service';

export type {
  EscrowStatus,
  EscrowType,
  EscrowCondition,
  EscrowEvidence,
  CreateEscrowParams,
  FundEscrowParams,
  ReleaseEscrowParams,
  RefundEscrowParams,
  DisputeEscrowParams,
  EscrowDetails,
  EscrowSummary,
} from './types';

export { PLATFORM_FEES, ESCROW_LIMITS } from './types';
