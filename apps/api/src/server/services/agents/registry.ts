/**
 * Agent Registry
 * Manages registration and retrieval of specialized agents
 */

import type { AgentType } from '@/server/infrastructure/database/schema';
import type { BaseAgent } from './base.agent';
import type { AgentConfig } from './types';

class AgentRegistry {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private configs: Map<AgentType, AgentConfig> = new Map();

  /**
   * Register an agent
   */
  register(agent: BaseAgent): void {
    const config = agent.getConfig();
    this.agents.set(config.type, agent);
    this.configs.set(config.type, config);

    console.log(`[AgentRegistry] Registered agent: ${config.name} (${config.type})`);
  }

  /**
   * Get an agent by type
   */
  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  /**
   * Get agent configuration
   */
  getConfig(type: AgentType): AgentConfig | undefined {
    return this.configs.get(type);
  }

  /**
   * Get all registered agent types
   */
  getAvailableTypes(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get all agent configurations (for API documentation)
   */
  getAllConfigs(): AgentConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Check if an agent type is available
   */
  isAvailable(type: AgentType): boolean {
    return this.agents.has(type);
  }

  /**
   * Get agent capabilities for display
   */
  getCapabilities(): {
    type: AgentType;
    name: string;
    description: string;
    capabilities: string[];
    pricing: {
      sessionCost: number;
      outcomeCost: number;
      transactionFeePercent?: number;
    };
  }[] {
    return Array.from(this.configs.values()).map((config) => ({
      type: config.type,
      name: config.name,
      description: config.description,
      capabilities: config.capabilities,
      pricing: {
        sessionCost: config.pricing.sessionCost,
        outcomeCost: config.pricing.outcomeCost,
        transactionFeePercent: config.pricing.transactionFeePercent,
      },
    }));
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();

// Default agent configurations (used as fallback)
export const DEFAULT_AGENT_CONFIGS: Record<AgentType, Partial<AgentConfig>> = {
  search: {
    name: 'Search Agent',
    description: 'Encuentra propiedades basándose en criterios de búsqueda naturales',
    capabilities: [
      'Búsqueda por texto natural',
      'Filtrado por ubicación, precio, características',
      'Ordenación inteligente por relevancia',
      'Sugerencias de búsqueda',
    ],
    pricing: {
      sessionCost: 0,
      outcomeCost: 0.05, // 5 cents per search result delivered
      billableOutcomes: ['search_result'],
    },
    limits: {
      maxTokensPerRequest: 4096,
      maxTurns: 20,
      sessionTimeoutMinutes: 30,
      maxConcurrentSessions: 5,
    },
  },
  verify: {
    name: 'Verify Agent',
    description: 'Verifica la autenticidad y calidad de propiedades',
    capabilities: [
      'Detección de fraude',
      'Análisis de imágenes',
      'Verificación de precios',
      'Puntuación de autenticidad',
    ],
    pricing: {
      sessionCost: 0,
      outcomeCost: 1.0, // 1 EUR per verification
      billableOutcomes: ['verification'],
    },
    limits: {
      maxTokensPerRequest: 8192,
      maxTurns: 10,
      sessionTimeoutMinutes: 15,
      maxConcurrentSessions: 3,
    },
  },
  negotiate: {
    name: 'Negotiate Agent',
    description: 'Asiste en negociaciones de precio y condiciones',
    capabilities: [
      'Análisis de mercado',
      'Sugerencias de oferta',
      'Estrategias de negociación',
      'Comparación con ventas recientes',
    ],
    pricing: {
      sessionCost: 0,
      outcomeCost: 2.0,
      billableOutcomes: ['lead_generated'],
    },
    limits: {
      maxTokensPerRequest: 4096,
      maxTurns: 30,
      sessionTimeoutMinutes: 60,
      maxConcurrentSessions: 2,
    },
  },
  service_match: {
    name: 'Service Match Agent',
    description: 'Conecta con proveedores de servicios por proximidad',
    capabilities: [
      'Búsqueda por proximidad',
      'Matching de categorías',
      'Comparación de presupuestos',
      'Reserva directa',
    ],
    pricing: {
      sessionCost: 0,
      outcomeCost: 0,
      transactionFeePercent: 0.10, // 10% of service booking
      billableOutcomes: ['service_booking'],
    },
    limits: {
      maxTokensPerRequest: 4096,
      maxTurns: 15,
      sessionTimeoutMinutes: 30,
      maxConcurrentSessions: 5,
    },
  },
  valuation: {
    name: 'Valuation Agent',
    description: 'Estima el valor de mercado de propiedades',
    capabilities: [
      'Valoración automática',
      'Análisis de comparables',
      'Factores de mercado',
      'Confianza de estimación',
    ],
    pricing: {
      sessionCost: 0,
      outcomeCost: 2.5, // 2.5 EUR per valuation
      billableOutcomes: ['valuation'],
    },
    limits: {
      maxTokensPerRequest: 8192,
      maxTurns: 10,
      sessionTimeoutMinutes: 15,
      maxConcurrentSessions: 3,
    },
  },
  alert: {
    name: 'Alert Agent',
    description: 'Monitorea y alerta sobre nuevas propiedades',
    capabilities: [
      'Monitoreo de criterios',
      'Alertas en tiempo real',
      'Detección de cambios de precio',
      'Notificaciones personalizadas',
    ],
    pricing: {
      sessionCost: 0,
      outcomeCost: 0.10,
      billableOutcomes: ['search_result'],
    },
    limits: {
      maxTokensPerRequest: 2048,
      maxTurns: 5,
      sessionTimeoutMinutes: 10,
      maxConcurrentSessions: 10,
    },
  },
  publish: {
    name: 'Publish Agent',
    description: 'Publica propiedades en múltiples portales',
    capabilities: [
      'Publicación multi-portal',
      'Optimización de descripciones',
      'Gestión de imágenes',
      'Sincronización automática',
    ],
    pricing: {
      sessionCost: 0,
      outcomeCost: 3.0, // 3 EUR per portal published
      billableOutcomes: ['portal_published'],
    },
    limits: {
      maxTokensPerRequest: 8192,
      maxTurns: 10,
      sessionTimeoutMinutes: 30,
      maxConcurrentSessions: 2,
    },
  },
  transaction: {
    name: 'Transaction Agent',
    description: 'Gestiona el proceso completo de compraventa',
    capabilities: [
      'Coordinación de transacción',
      'Gestión de escrow',
      'Documentación legal',
      'Seguimiento de pagos',
    ],
    pricing: {
      sessionCost: 0,
      outcomeCost: 0,
      transactionFeePercent: 0.003, // 0.3% of transaction value
      billableOutcomes: ['property_sold', 'property_rented'],
    },
    limits: {
      maxTokensPerRequest: 8192,
      maxTurns: 50,
      sessionTimeoutMinutes: 120,
      maxConcurrentSessions: 1,
    },
  },
};
