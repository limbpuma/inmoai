/**
 * Coordinator Agent
 * The "brain" that orchestrates other agents for complex tasks
 */

import { BaseAgent } from '../base.agent';
import type {
  AgentContext,
  AgentOutcome,
  AgentResponse,
  AgentTool,
} from '../types';
import { agentRegistry, DEFAULT_AGENT_CONFIGS } from '../registry';
import type { AgentType } from '@/server/infrastructure/database/schema';

// ============================================
// TYPES
// ============================================

interface ExecutionPlan {
  intent: string;
  agents: AgentType[];
  parallel: boolean;
  sequence?: AgentType[][];
  params: Record<string, Record<string, unknown>>;
  reasoning: string;
}

interface AgentExecutionResult {
  agent: AgentType;
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

// ============================================
// TOOLS
// ============================================

const analyzeTaskTool: AgentTool = {
  name: 'analyze_task',
  description: 'Analiza una tarea y determina qué agentes usar',
  parameters: {
    task: { type: 'string', description: 'Descripción de la tarea', required: true },
    context: { type: 'object', description: 'Contexto adicional' },
  },
  execute: async (params, context) => {
    const { task, context: taskContext } = params as {
      task: string;
      context?: Record<string, unknown>;
    };

    // Use AI to analyze the task and create an execution plan
    const plan = await analyzeTaskWithAI(task, taskContext);

    return {
      success: true,
      data: plan,
    };
  },
};

const executeAgentTool: AgentTool = {
  name: 'execute_agent',
  description: 'Ejecuta un agente específico',
  parameters: {
    agentType: { type: 'string', description: 'Tipo de agente', required: true },
    message: { type: 'string', description: 'Mensaje para el agente', required: true },
    params: { type: 'object', description: 'Parámetros adicionales' },
  },
  execute: async (params, context) => {
    const { agentType, message, params: agentParams } = params as {
      agentType: AgentType;
      message: string;
      params?: Record<string, unknown>;
    };

    const startTime = Date.now();

    try {
      const agent = agentRegistry.getAgent(agentType);

      if (!agent) {
        return {
          success: false,
          error: `Agent '${agentType}' not found`,
        };
      }

      // Create a sub-context for the agent
      const subContext: AgentContext = {
        ...context,
        agentType,
        initialContext: {
          ...context.initialContext,
          ...agentParams,
        },
      };

      const response = await agent.processMessage(message, subContext);

      return {
        success: true,
        data: {
          agent: agentType,
          response: response.message,
          data: response.data,
          outcomes: response.outcomes,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          agent: agentType,
          durationMs: Date.now() - startTime,
        },
      };
    }
  },
};

const executeParallelTool: AgentTool = {
  name: 'execute_parallel',
  description: 'Ejecuta múltiples agentes en paralelo',
  parameters: {
    executions: {
      type: 'array',
      description: 'Lista de ejecuciones',
      required: true,
      items: {
        type: 'object',
      },
    },
  },
  execute: async (params, context) => {
    const { executions } = params as {
      executions: Array<{
        agentType: AgentType;
        message: string;
        params?: Record<string, unknown>;
      }>;
    };

    const startTime = Date.now();

    // Execute all agents in parallel
    const results = await Promise.allSettled(
      executions.map(async (exec) => {
        const agent = agentRegistry.getAgent(exec.agentType);

        if (!agent) {
          throw new Error(`Agent '${exec.agentType}' not found`);
        }

        const subContext: AgentContext = {
          ...context,
          agentType: exec.agentType,
          initialContext: {
            ...context.initialContext,
            ...exec.params,
          },
        };

        const response = await agent.processMessage(exec.message, subContext);

        return {
          agent: exec.agentType,
          response: response.message,
          data: response.data,
          outcomes: response.outcomes,
        };
      })
    );

    const processedResults: AgentExecutionResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          agent: executions[index].agentType,
          success: true,
          result: result.value,
          durationMs: Date.now() - startTime,
        };
      } else {
        return {
          agent: executions[index].agentType,
          success: false,
          error: result.reason?.message || 'Unknown error',
          durationMs: Date.now() - startTime,
        };
      }
    });

    return {
      success: processedResults.some((r) => r.success),
      data: {
        results: processedResults,
        successCount: processedResults.filter((r) => r.success).length,
        totalCount: processedResults.length,
        totalDurationMs: Date.now() - startTime,
      },
    };
  },
};

const getAgentCapabilitiesTool: AgentTool = {
  name: 'get_agent_capabilities',
  description: 'Obtiene las capacidades de todos los agentes disponibles',
  parameters: {},
  execute: async () => {
    const capabilities = agentRegistry.getCapabilities();

    return {
      success: true,
      data: {
        agents: capabilities,
        availableTypes: agentRegistry.getAvailableTypes(),
      },
    };
  },
};

const synthesizeResultsTool: AgentTool = {
  name: 'synthesize_results',
  description: 'Combina y sintetiza resultados de múltiples agentes',
  parameters: {
    results: { type: 'array', description: 'Resultados de los agentes', required: true },
    originalTask: { type: 'string', description: 'Tarea original', required: true },
  },
  execute: async (params) => {
    const { results, originalTask } = params as {
      results: AgentExecutionResult[];
      originalTask: string;
    };

    // Use AI to synthesize results
    const synthesis = await synthesizeWithAI(results, originalTask);

    return {
      success: true,
      data: synthesis,
    };
  },
};

// ============================================
// AI HELPERS
// ============================================

async function analyzeTaskWithAI(
  task: string,
  context?: Record<string, unknown>
): Promise<ExecutionPlan> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const { env } = await import('@/config/env');

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const agentDescriptions = Object.entries(DEFAULT_AGENT_CONFIGS)
    .map(([type, config]) => `- ${type}: ${config.description}`)
    .join('\n');

  const prompt = `Analiza esta tarea y determina qué agentes de InmoAI usar.

TAREA: ${task}

CONTEXTO ADICIONAL:
${context ? JSON.stringify(context, null, 2) : 'Ninguno'}

AGENTES DISPONIBLES:
${agentDescriptions}

Responde en JSON con este formato exacto:
{
  "intent": "descripción corta del objetivo",
  "agents": ["agent1", "agent2"],
  "parallel": true/false,
  "sequence": [["step1"], ["step2", "step3"]],
  "params": {
    "agent1": { "param": "value" },
    "agent2": { "param": "value" }
  },
  "reasoning": "explicación de por qué estos agentes y este orden"
}

REGLAS:
1. Usa "parallel: true" si los agentes son independientes
2. Usa "sequence" para definir orden si hay dependencias
3. Incluye solo agentes necesarios
4. Los params deben coincidir con las capacidades del agente

Responde SOLO con el JSON válido.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse execution plan');
  }

  try {
    return JSON.parse(jsonMatch[0]) as ExecutionPlan;
  } catch {
    throw new Error('Invalid execution plan JSON');
  }
}

async function synthesizeWithAI(
  results: AgentExecutionResult[],
  originalTask: string
): Promise<{
  summary: string;
  highlights: string[];
  nextSteps: string[];
  aggregatedData: Record<string, unknown>;
}> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const { env } = await import('@/config/env');

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Sintetiza los resultados de múltiples agentes en una respuesta coherente.

TAREA ORIGINAL: ${originalTask}

RESULTADOS DE AGENTES:
${results
  .map(
    (r) => `
--- ${r.agent.toUpperCase()} ---
Éxito: ${r.success}
${r.success ? `Resultado: ${JSON.stringify(r.result, null, 2)}` : `Error: ${r.error}`}
`
  )
  .join('\n')}

Genera una síntesis en JSON:
{
  "summary": "Resumen ejecutivo en 2-3 frases",
  "highlights": ["punto clave 1", "punto clave 2"],
  "nextSteps": ["siguiente paso sugerido 1", "siguiente paso 2"],
  "aggregatedData": {
    "campo1": "valor combinado",
    "campo2": "valor combinado"
  }
}

Responde en español y SOLO con el JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      summary: 'Tarea completada con resultados parciales.',
      highlights: results.filter((r) => r.success).map((r) => `${r.agent}: completado`),
      nextSteps: ['Revisar resultados detallados'],
      aggregatedData: {},
    };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      summary: 'Tarea completada.',
      highlights: [],
      nextSteps: [],
      aggregatedData: {},
    };
  }
}

// ============================================
// COORDINATOR AGENT CLASS
// ============================================

export class CoordinatorAgent extends BaseAgent {
  constructor() {
    super({
      type: 'coordinator',
      name: 'Coordinator Agent',
      description: 'Orquesta múltiples agentes para tareas complejas',
      capabilities: [
        'Interpreta intenciones naturales del usuario',
        'Decide qué agentes invocar',
        'Ejecuta agentes en paralelo o secuencia',
        'Combina y sintetiza resultados',
        'Mantiene contexto cross-agent',
        'Optimiza costos de ejecución',
      ],
      pricing: {
        sessionCost: 0,
        outcomeCost: 0, // El costo se aplica a los agentes delegados
        billableOutcomes: ['agent_delegation'],
      },
      limits: {
        maxTokensPerRequest: 8192,
        maxTurns: 30,
        sessionTimeoutMinutes: 60,
        maxConcurrentSessions: 3,
      },
      systemPrompt: `Eres el Coordinator Agent de InmoAI, el cerebro que orquesta todos los demás agentes.

TU ROL:
- Interpretar tareas complejas del usuario
- Decidir qué agentes usar y en qué orden
- Ejecutar agentes en paralelo cuando sea posible
- Combinar resultados en respuestas coherentes
- Optimizar el flujo para minimizar costos

AGENTES DISPONIBLES:
- search: Buscar propiedades
- verify: Verificar propiedades en el Catastro
- valuation: Estimar valor de mercado
- content: Generar contenido de marketing
- social_media: Publicar en redes sociales
- service_match: Encontrar proveedores de servicios
- negotiate: Asistir en negociaciones
- alert: Configurar alertas

ESTRATEGIA DE EJECUCIÓN:
1. Analiza la tarea completa
2. Identifica dependencias entre agentes
3. Agrupa agentes independientes para ejecución paralela
4. Ejecuta secuencialmente cuando hay dependencias
5. Sintetiza resultados en respuesta unificada

EJEMPLO:
Usuario: "Publica mi piso en redes y busca pintores cerca"
Plan:
1. [Paralelo] content + service_match
   - content: genera descripción y hashtags
   - service_match: busca pintores cercanos
2. [Secuencial] social_media
   - social_media: publica con el contenido generado
3. Sintetizar resultados

Responde siempre en español y sé conciso.`,
      tools: [
        analyzeTaskTool,
        executeAgentTool,
        executeParallelTool,
        getAgentCapabilitiesTool,
        synthesizeResultsTool,
      ],
    });
  }

  protected async executeAgentLogic(
    userMessage: string,
    context: AgentContext,
    conversationContext: string
  ): Promise<{
    response: string;
    toolCalls: AgentResponse['toolCalls'];
    outcomes: AgentOutcome[];
    data?: AgentResponse['data'];
  }> {
    const outcomes: AgentOutcome[] = [];
    const toolCalls: AgentResponse['toolCalls'] = [];
    const allResults: AgentExecutionResult[] = [];

    try {
      // Step 1: Analyze the task
      const analyzeResult = await this.executeTool(
        'analyze_task',
        {
          task: userMessage,
          context: context.initialContext,
        },
        context
      );

      if (!analyzeResult.success) {
        return {
          response: 'No pude analizar la tarea. ¿Puedes reformularla?',
          toolCalls: [],
          outcomes: [],
        };
      }

      const plan = analyzeResult.data as ExecutionPlan;

      toolCalls.push({
        name: 'analyze_task',
        args: { task: userMessage },
        result: JSON.stringify(plan),
      });

      // Step 2: Execute agents
      if (plan.parallel && plan.agents.length > 1) {
        // Parallel execution
        const executions = plan.agents.map((agentType) => ({
          agentType: agentType as AgentType,
          message: this.buildAgentMessage(userMessage, agentType, plan.params[agentType]),
          params: plan.params[agentType],
        }));

        const parallelResult = await this.executeTool(
          'execute_parallel',
          { executions },
          context
        );

        toolCalls.push({
          name: 'execute_parallel',
          args: { agents: plan.agents },
          result: JSON.stringify(parallelResult.data),
        });

        if (parallelResult.success && parallelResult.data) {
          allResults.push(...(parallelResult.data as { results: AgentExecutionResult[] }).results);
        }
      } else if (plan.sequence) {
        // Sequential execution with steps
        for (const step of plan.sequence) {
          if (step.length > 1) {
            // Parallel within step
            const executions = step.map((agentType) => ({
              agentType: agentType as AgentType,
              message: this.buildAgentMessage(userMessage, agentType, plan.params[agentType]),
              params: plan.params[agentType],
            }));

            const parallelResult = await this.executeTool(
              'execute_parallel',
              { executions },
              context
            );

            if (parallelResult.success && parallelResult.data) {
              allResults.push(...(parallelResult.data as { results: AgentExecutionResult[] }).results);
            }
          } else {
            // Single agent in step
            const agentType = step[0] as AgentType;
            const executeResult = await this.executeTool(
              'execute_agent',
              {
                agentType,
                message: this.buildAgentMessage(userMessage, agentType, plan.params[agentType]),
                params: plan.params[agentType],
              },
              context
            );

            allResults.push({
              agent: agentType,
              success: executeResult.success,
              result: executeResult.data,
              error: executeResult.error,
              durationMs: (executeResult.data as { durationMs?: number })?.durationMs || 0,
            });
          }
        }
      } else {
        // Simple sequential execution
        for (const agentType of plan.agents) {
          const executeResult = await this.executeTool(
            'execute_agent',
            {
              agentType,
              message: this.buildAgentMessage(userMessage, agentType, plan.params[agentType]),
              params: plan.params[agentType],
            },
            context
          );

          allResults.push({
            agent: agentType as AgentType,
            success: executeResult.success,
            result: executeResult.data,
            error: executeResult.error,
            durationMs: (executeResult.data as { durationMs?: number })?.durationMs || 0,
          });
        }
      }

      // Step 3: Synthesize results
      const synthesisResult = await this.executeTool(
        'synthesize_results',
        {
          results: allResults,
          originalTask: userMessage,
        },
        context
      );

      const synthesis = synthesisResult.data as {
        summary: string;
        highlights: string[];
        nextSteps: string[];
        aggregatedData: Record<string, unknown>;
      };

      toolCalls.push({
        name: 'synthesize_results',
        args: { resultCount: allResults.length },
        result: JSON.stringify(synthesis),
      });

      // Create outcome for delegation
      if (allResults.length > 0) {
        outcomes.push(
          this.createOutcome(
            'agent_delegation',
            `Coordinación de ${allResults.length} agentes`,
            {
              agents: allResults.map((r) => r.agent),
              successCount: allResults.filter((r) => r.success).length,
            }
          )
        );
      }

      // Build response
      const response = this.buildResponse(synthesis, allResults, plan);

      return {
        response,
        toolCalls,
        outcomes,
        data: {
          plan,
          results: allResults,
          synthesis,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        response: `Hubo un error al coordinar los agentes: ${errorMessage}`,
        toolCalls,
        outcomes,
      };
    }
  }

  private buildAgentMessage(
    originalTask: string,
    agentType: string,
    params?: Record<string, unknown>
  ): string {
    // Build a focused message for each agent based on the original task
    const paramStr = params ? ` Parámetros: ${JSON.stringify(params)}` : '';
    return `${originalTask}${paramStr}`;
  }

  private buildResponse(
    synthesis: {
      summary: string;
      highlights: string[];
      nextSteps: string[];
      aggregatedData: Record<string, unknown>;
    },
    results: AgentExecutionResult[],
    plan: ExecutionPlan
  ): string {
    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    let response = synthesis.summary;

    if (synthesis.highlights.length > 0) {
      response += '\n\n**Resultados destacados:**\n';
      response += synthesis.highlights.map((h) => `• ${h}`).join('\n');
    }

    if (synthesis.nextSteps.length > 0) {
      response += '\n\n**Próximos pasos sugeridos:**\n';
      response += synthesis.nextSteps.map((s) => `• ${s}`).join('\n');
    }

    if (successCount < totalCount) {
      response += `\n\n⚠️ ${totalCount - successCount} de ${totalCount} agentes tuvieron problemas.`;
    }

    return response;
  }

  protected async generateSuggestions(
    context: AgentContext,
    response: string
  ): Promise<string[]> {
    return [
      'Ejecutar otra tarea compleja',
      'Ver detalles de cada agente',
      'Repetir con diferentes parámetros',
      'Crear un workflow automatizado',
    ];
  }
}

// Export singleton
export const coordinatorAgent = new CoordinatorAgent();
