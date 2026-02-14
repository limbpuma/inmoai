/**
 * Base Agent - Abstract class for all specialized agents
 * Provides common functionality for conversation, tool execution, and billing
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/config/env';
import type {
  AgentConfig,
  AgentContext,
  AgentTool,
  ToolResult,
  ConversationMessage,
  AgentResponse,
  AgentOutcome,
  TurnUsage,
} from './types';
import type { AgentType, AgentTransactionType } from '@/server/infrastructure/database/schema';

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected gemini: GoogleGenerativeAI;
  protected model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor(config: AgentConfig) {
    this.config = config;
    this.gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
  }

  /**
   * Get agent type
   */
  get type(): AgentType {
    return this.config.type;
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Process a user message and generate a response
   */
  async processMessage(
    userMessage: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    // Build conversation context for the model
    const conversationContext = this.buildConversationContext(context);

    // Execute agent logic
    const { response, toolCalls, outcomes } = await this.executeAgentLogic(
      userMessage,
      context,
      conversationContext
    );

    // Calculate usage
    const usage = this.calculateUsage(
      userMessage,
      response,
      Date.now() - startTime
    );

    // Generate suggestions for next action
    const suggestions = await this.generateSuggestions(context, response);

    return {
      sessionToken: context.sessionToken,
      status: this.determineSessionStatus(context, outcomes),
      message: response,
      toolCalls,
      suggestions,
      usage,
      outcomes,
    };
  }

  /**
   * Build conversation context from history
   */
  protected buildConversationContext(context: AgentContext): string {
    const history = context.conversationHistory
      .map((msg) => {
        const prefix = msg.role === 'user' ? 'Usuario' : msg.role === 'agent' ? 'Agente' : 'Sistema';
        return `${prefix}: ${msg.content}`;
      })
      .join('\n\n');

    return `
${this.config.systemPrompt}

--- CONTEXTO DE LA CONVERSACIÓN ---
${history || 'Nueva conversación'}

--- INFORMACIÓN ADICIONAL ---
${this.buildContextInfo(context)}
`;
  }

  /**
   * Build additional context information
   */
  protected buildContextInfo(context: AgentContext): string {
    const parts: string[] = [];

    if (context.initialContext.listingId) {
      parts.push(`Propiedad de referencia: ${context.initialContext.listingId}`);
    }
    if (context.initialContext.intent) {
      parts.push(`Intención del usuario: ${context.initialContext.intent}`);
    }
    if (context.locale) {
      parts.push(`Idioma: ${context.locale}`);
    }

    return parts.join('\n') || 'Sin contexto adicional';
  }

  /**
   * Execute the agent's core logic
   * Must be implemented by each specialized agent
   */
  protected abstract executeAgentLogic(
    userMessage: string,
    context: AgentContext,
    conversationContext: string
  ): Promise<{
    response: string;
    toolCalls: AgentResponse['toolCalls'];
    outcomes: AgentOutcome[];
    data?: AgentResponse['data'];
  }>;

  /**
   * Execute a tool and handle results
   */
  protected async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: AgentContext
  ): Promise<ToolResult> {
    const tool = this.config.tools.find((t) => t.name === toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
      };
    }

    try {
      const result = await tool.execute(params, context);
      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate follow-up suggestions
   */
  protected async generateSuggestions(
    context: AgentContext,
    response: string
  ): Promise<string[]> {
    // Default suggestions based on agent type
    const suggestions: string[] = [];

    switch (this.config.type) {
      case 'search':
        suggestions.push(
          'Mostrar más resultados',
          'Filtrar por precio',
          'Ver detalles de una propiedad'
        );
        break;
      case 'verify':
        suggestions.push(
          'Verificar otra propiedad',
          'Ver detalles del análisis',
          'Contactar al propietario'
        );
        break;
      case 'valuation':
        suggestions.push(
          'Ver propiedades comparables',
          'Solicitar valoración profesional',
          'Exportar informe'
        );
        break;
      case 'service_match':
        suggestions.push(
          'Ver más proveedores',
          'Solicitar presupuesto',
          'Comparar servicios'
        );
        break;
      default:
        suggestions.push('¿En qué más puedo ayudarte?');
    }

    return suggestions;
  }

  /**
   * Calculate token usage for a turn
   */
  protected calculateUsage(
    input: string,
    output: string,
    durationMs: number
  ): TurnUsage {
    // Rough estimation: ~4 characters per token
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);

    return {
      inputTokens,
      outputTokens,
      durationMs,
      modelUsed: 'gemini-2.0-flash',
    };
  }

  /**
   * Determine if session should continue or complete
   */
  protected determineSessionStatus(
    context: AgentContext,
    outcomes: AgentOutcome[]
  ): AgentResponse['status'] {
    // Check if max turns reached
    if (context.conversationHistory.length >= this.config.limits.maxTurns * 2) {
      return 'completed';
    }

    // Check if agent has generated significant outcomes
    const significantOutcome = outcomes.some((o) =>
      ['property_sold', 'property_rented', 'service_booking'].includes(o.type)
    );
    if (significantOutcome) {
      return 'completed';
    }

    return 'active';
  }

  /**
   * Create a billable outcome
   */
  protected createOutcome(
    type: AgentTransactionType,
    description: string,
    data: Record<string, unknown>,
    amount?: number
  ): AgentOutcome {
    const pricing = this.config.pricing;

    // Calculate amount based on type
    let outcomeAmount = amount ?? pricing.outcomeCost;

    // For transaction-based fees, calculate percentage
    if (pricing.transactionFeePercent && data.transactionAmount) {
      outcomeAmount = (data.transactionAmount as number) * pricing.transactionFeePercent;
    }

    return {
      type,
      description,
      amount: outcomeAmount,
      data,
    };
  }

  /**
   * Format currency for display
   */
  protected formatCurrency(amount: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Parse structured response from model
   */
  protected parseModelResponse(text: string): Record<string, unknown> | null {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return null;
    }

    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  /**
   * Generate a response using the model
   */
  protected async generateModelResponse(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}
