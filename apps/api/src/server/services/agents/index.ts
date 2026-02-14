/**
 * AI Agent System - Public API
 */

// Core services
export { orchestrator } from './orchestrator.service';
export { agentRegistry, DEFAULT_AGENT_CONFIGS } from './registry';
export { BaseAgent } from './base.agent';

// Types
export type {
  AgentConfig,
  AgentContext,
  AgentRequest,
  AgentResponse,
  AgentTool,
  ToolResult,
  ToolParameter,
  ConversationMessage,
  AgentOutcome,
  SessionUsage,
  TurnUsage,
  SessionInitialContext,
  SessionCreateParams,
  OrchestratorConfig,
  // Response data types
  AgentResponseData,
  SearchResultItem,
  VerificationResult,
  VerificationCheck,
  ValuationData,
  ValuationFactor,
  ComparableListing,
  ProviderMatch,
  BookingConfirmation,
  // B2B types
  B2BApiRequest,
  B2BApiResponse,
} from './types';

// Specialized agents
export { SearchAgent, searchAgent } from './specialized/search.agent';
export { VerifyAgent, verifyAgent } from './specialized/verify.agent';
export { ValuationAgent, valuationAgent } from './specialized/valuation.agent';
export { ServiceMatchAgent, serviceMatchAgent } from './specialized/service-match.agent';
