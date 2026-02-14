/**
 * AI Agent System Types
 * Core types for the Agent as a Service platform
 */

import type { AgentType, AgentSessionStatus, AgentTransactionType } from '@/server/infrastructure/database/schema';

// ============================================
// AGENT CONFIGURATION
// ============================================

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  pricing: AgentPricing;
  limits: AgentLimits;
  systemPrompt: string;
  tools: AgentTool[];
}

export interface AgentPricing {
  /** Base cost per session (EUR) */
  sessionCost: number;
  /** Cost per successful outcome (EUR) */
  outcomeCost: number;
  /** Percentage fee for transactions (0.003 = 0.3%) */
  transactionFeePercent?: number;
  /** Billable transaction types for this agent */
  billableOutcomes: AgentTransactionType[];
}

export interface AgentLimits {
  /** Max tokens per request */
  maxTokensPerRequest: number;
  /** Max conversation turns */
  maxTurns: number;
  /** Session timeout in minutes */
  sessionTimeoutMinutes: number;
  /** Max concurrent sessions per user */
  maxConcurrentSessions: number;
}

// ============================================
// AGENT TOOLS (Functions)
// ============================================

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<ToolResult>;
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
  items?: ToolParameter;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  /** Indicates if this result generates a billable outcome */
  isBillable?: boolean;
  billableType?: AgentTransactionType;
  billableAmount?: number;
}

/** Record of a tool call made during agent execution */
export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: string | undefined;
}

// ============================================
// AGENT CONTEXT
// ============================================

export interface AgentContext {
  sessionId: string;
  sessionToken: string;
  userId?: string;
  apiKeyId?: string;
  agentType: AgentType;
  locale: string;

  /** Initial context from session start */
  initialContext: SessionInitialContext;

  /** Current conversation history */
  conversationHistory: ConversationMessage[];

  /** Accumulated usage in this session */
  usage: SessionUsage;

  /** Related entity IDs for this session */
  relatedEntities: {
    listingId?: string;
    providerId?: string;
    leadId?: string;
  };
}

export interface SessionInitialContext {
  listingId?: string;
  searchCriteria?: Record<string, unknown>;
  providerId?: string;
  intent?: string;
  referrer?: string;
  locale?: string;
}

export interface ConversationMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  outcomesGenerated: number;
  estimatedCost: number;
}

// ============================================
// AGENT REQUEST/RESPONSE
// ============================================

export interface AgentRequest {
  /** Session token for continuing conversation */
  sessionToken?: string;

  /** Agent type to use (required for new sessions) */
  agentType?: AgentType;

  /** User message */
  message: string;

  /** Initial context for new sessions */
  context?: SessionInitialContext;

  /** Metadata about the request */
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    source?: 'web' | 'api' | 'widget' | 'mobile_app';
  };
}

export interface AgentResponse {
  sessionToken: string;
  status: AgentSessionStatus;

  /** Agent's response message */
  message: string;

  /** Structured data returned by the agent */
  data?: AgentResponseData;

  /** Tool calls made in this turn */
  toolCalls?: ToolCallRecord[];

  /** Suggestions for user's next action */
  suggestions?: string[];

  /** Usage metrics for this turn */
  usage: TurnUsage;

  /** Outcomes generated in this turn */
  outcomes?: AgentOutcome[];
}

export interface AgentResponseData {
  /** Search results */
  listings?: SearchResultItem[];

  /** Verification results */
  verification?: VerificationResult;

  /** Valuation results */
  valuation?: ValuationData;

  /** Matched service providers */
  providers?: ProviderMatch[];

  /** Booking confirmation */
  booking?: BookingConfirmation;

  /** Generic key-value data */
  [key: string]: unknown;
}

export interface TurnUsage {
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  modelUsed: string;
}

export interface AgentOutcome {
  type: AgentTransactionType;
  description: string;
  amount: number;
  data: Record<string, unknown>;
}

// ============================================
// SEARCH AGENT TYPES
// ============================================

export interface SearchResultItem {
  id: string;
  title: string;
  price: number;
  priceFormatted: string;
  location: {
    city: string;
    neighborhood?: string;
    address?: string;
  };
  features: {
    bedrooms?: number;
    bathrooms?: number;
    sizeSqm?: number;
    propertyType: string;
  };
  imageUrl?: string;
  matchScore: number;
  highlights: string[];
}

// ============================================
// VERIFY AGENT TYPES
// ============================================

export interface VerificationResult {
  listingId: string;
  overallScore: number;
  isVerified: boolean;
  checks: VerificationCheck[];
  warnings: string[];
  recommendations: string[];
}

export interface VerificationCheck {
  name: string;
  status: 'passed' | 'warning' | 'failed';
  score: number;
  details: string;
}

// ============================================
// VALUATION AGENT TYPES
// ============================================

export interface ValuationData {
  listingId: string;
  estimatedValue: {
    min: number;
    max: number;
    median: number;
  };
  pricePerSqm: {
    min: number;
    max: number;
  };
  confidence: number;
  comparables: ComparableListing[];
  factors: ValuationFactor[];
}

export interface ComparableListing {
  id: string;
  title: string;
  price: number;
  sizeSqm: number;
  location: string;
  soldDate?: string;
  similarity: number;
}

export interface ValuationFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  valueImpact?: number;
}

// ============================================
// SERVICE MATCH AGENT TYPES
// ============================================

export interface ProviderMatch {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  priceRange: {
    min: number;
    max: number;
  };
  matchScore: number;
  highlights: string[];
  isVerified: boolean;
  tier: string;
}

export interface BookingConfirmation {
  leadId: string;
  providerId: string;
  status: 'pending' | 'confirmed' | 'scheduled';
  scheduledDate?: string;
  estimatedCost?: {
    min: number;
    max: number;
  };
  nextSteps: string[];
}

// ============================================
// B2B API TYPES
// ============================================

export interface B2BApiRequest {
  apiKey: string;
  agentType: AgentType;
  operation: string;
  params: Record<string, unknown>;
  webhookUrl?: string;
}

export interface B2BApiResponse {
  requestId: string;
  status: 'success' | 'error' | 'pending';
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
  usage: {
    creditsUsed: number;
    creditsRemaining: number;
  };
  webhookSent?: boolean;
}

// ============================================
// ORCHESTRATOR TYPES
// ============================================

export interface OrchestratorConfig {
  defaultModel: string;
  maxRetries: number;
  retryDelayMs: number;
  enableUsageTracking: boolean;
  enableBilling: boolean;
}

export interface SessionCreateParams {
  userId?: string;
  apiKeyId?: string;
  agentType: AgentType;
  initialContext?: SessionInitialContext;
  metadata?: AgentRequest['metadata'];
}

export interface SessionResumeParams {
  sessionToken: string;
}
