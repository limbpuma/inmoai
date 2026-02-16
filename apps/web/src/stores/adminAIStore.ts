import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AdminAIState,
  AIMode,
  AIStatus,
  AIFunction,
  AIAction,
  AIEvent,
  AIDecision,
  AIAlert,
  AIConfig,
  AIMetrics,
  DEFAULT_FUNCTION_CONFIGS,
} from '@/types/adminAI';

// Generate unique IDs
const generateId = () => crypto.randomUUID();

// Default configuration
const defaultConfig: AIConfig = {
  mode: 'lazy',
  autoApproveThreshold: 1, // Only auto-approve low impact
  maxConcurrentActions: 3,
  notifyOnAction: true,
  notifyOnError: true,
  pauseOnError: false,
  functions: Object.entries(DEFAULT_FUNCTION_CONFIGS).reduce(
    (acc, [key, config]) => ({
      ...acc,
      [key]: { ...config, id: key as AIFunction },
    }),
    {} as AIConfig['functions']
  ),
};

// Default metrics
const defaultMetrics: AIMetrics = {
  mode: 'lazy',
  status: 'idle',
  uptime: 0,
  actionsToday: 0,
  actionsThisWeek: 0,
  successRate: 100,
  avgResponseTime: 0,
  pendingDecisions: 0,
  activeAlerts: 0,
};

export const useAdminAIStore = create<AdminAIState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: defaultConfig,
      status: 'idle',
      currentActions: [],
      actionHistory: [],
      events: [],
      pendingDecisions: [],
      alerts: [],
      metrics: defaultMetrics,

      // Mode actions
      setMode: (mode: AIMode) => {
        set((state) => ({
          config: { ...state.config, mode },
          metrics: { ...state.metrics, mode },
        }));
        get().addEvent({
          type: 'alert',
          function: 'data_pipeline', // Generic
          message: `Modo cambiado a ${mode.toUpperCase()}`,
          severity: 'info',
        });
      },

      // Function configuration
      setFunctionEnabled: (func: AIFunction, enabled: boolean) => {
        set((state) => ({
          config: {
            ...state.config,
            functions: {
              ...state.config.functions,
              [func]: { ...state.config.functions[func], enabled },
            },
          },
        }));
        get().addEvent({
          type: 'alert',
          function: func,
          message: `${get().config.functions[func].name} ${enabled ? 'activado' : 'desactivado'}`,
          severity: 'info',
        });
      },

      setFunctionMode: (func: AIFunction, mode: AIMode) => {
        set((state) => ({
          config: {
            ...state.config,
            functions: {
              ...state.config.functions,
              [func]: { ...state.config.functions[func], mode },
            },
          },
        }));
      },

      // Action execution
      triggerAction: async (func: AIFunction) => {
        const state = get();
        const funcConfig = state.config.functions[func];

        if (!funcConfig.enabled) {
          get().addAlert({
            function: func,
            severity: 'warning',
            title: 'Funcion desactivada',
            message: `No se puede ejecutar ${funcConfig.name} porque esta desactivada`,
          });
          return;
        }

        // Check concurrent actions limit
        if (state.currentActions.length >= state.config.maxConcurrentActions) {
          get().addAlert({
            function: func,
            severity: 'warning',
            title: 'Limite de acciones',
            message: `Se ha alcanzado el limite de ${state.config.maxConcurrentActions} acciones simultaneas`,
          });
          return;
        }

        const action: AIAction = {
          id: generateId(),
          function: func,
          type: 'manual',
          status: 'running',
          startedAt: new Date(),
        };

        set((state) => ({
          status: 'working',
          currentActions: [...state.currentActions, action],
        }));

        get().addEvent({
          type: 'start',
          function: func,
          message: `Iniciando ${funcConfig.name}`,
          severity: 'info',
        });

        // Simulate action execution
        await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000));

        const success = Math.random() > 0.1; // 90% success rate
        const completedAction: AIAction = {
          ...action,
          status: success ? 'completed' : 'failed',
          completedAt: new Date(),
          result: success
            ? {
                success: true,
                itemsProcessed: Math.floor(Math.random() * 100) + 10,
                itemsAffected: Math.floor(Math.random() * 20),
                duration: Date.now() - action.startedAt.getTime(),
              }
            : undefined,
          error: success ? undefined : 'Simulated error for testing',
        };

        set((state) => ({
          status: state.currentActions.length <= 1 ? 'idle' : 'working',
          currentActions: state.currentActions.filter((a) => a.id !== action.id),
          actionHistory: [completedAction, ...state.actionHistory].slice(0, 100),
          metrics: {
            ...state.metrics,
            actionsToday: state.metrics.actionsToday + 1,
            actionsThisWeek: state.metrics.actionsThisWeek + 1,
            lastActivity: new Date(),
          },
        }));

        get().addEvent({
          type: success ? 'complete' : 'error',
          function: func,
          message: success
            ? `${funcConfig.name} completado exitosamente`
            : `Error en ${funcConfig.name}`,
          severity: success ? 'success' : 'error',
        });

        if (!success) {
          get().addAlert({
            function: func,
            severity: 'error',
            title: `Error en ${funcConfig.name}`,
            message: completedAction.error || 'Error desconocido',
          });
        }
      },

      cancelAction: (actionId: string) => {
        set((state) => {
          const action = state.currentActions.find((a) => a.id === actionId);
          if (!action) return state;

          const cancelledAction: AIAction = {
            ...action,
            status: 'cancelled',
            completedAt: new Date(),
          };

          return {
            currentActions: state.currentActions.filter((a) => a.id !== actionId),
            actionHistory: [cancelledAction, ...state.actionHistory],
            status: state.currentActions.length <= 1 ? 'idle' : 'working',
          };
        });
      },

      // Decisions
      approveDecision: (decisionId: string) => {
        set((state) => ({
          pendingDecisions: state.pendingDecisions.map((d) =>
            d.id === decisionId
              ? { ...d, status: 'approved', approvedAt: new Date() }
              : d
          ),
          metrics: {
            ...state.metrics,
            pendingDecisions: state.metrics.pendingDecisions - 1,
          },
        }));
      },

      rejectDecision: (decisionId: string) => {
        set((state) => ({
          pendingDecisions: state.pendingDecisions.map((d) =>
            d.id === decisionId ? { ...d, status: 'rejected' } : d
          ),
          metrics: {
            ...state.metrics,
            pendingDecisions: state.metrics.pendingDecisions - 1,
          },
        }));
      },

      // Alerts
      acknowledgeAlert: (alertId: string) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId
              ? { ...a, acknowledged: true, acknowledgedAt: new Date() }
              : a
          ),
          metrics: {
            ...state.metrics,
            activeAlerts: state.alerts.filter((a) => !a.acknowledged && a.id !== alertId).length,
          },
        }));
      },

      clearAlerts: () => {
        set((state) => ({
          alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })),
          metrics: { ...state.metrics, activeAlerts: 0 },
        }));
      },

      // Pause/Resume
      pause: () => {
        set({ status: 'paused' });
        get().addEvent({
          type: 'alert',
          function: 'data_pipeline',
          message: 'Sistema IA pausado',
          severity: 'warning',
        });
      },

      resume: () => {
        set({ status: 'idle' });
        get().addEvent({
          type: 'alert',
          function: 'data_pipeline',
          message: 'Sistema IA reanudado',
          severity: 'info',
        });
      },

      // Internal helpers
      addEvent: (event) => {
        const newEvent: AIEvent = {
          ...event,
          id: generateId(),
          timestamp: new Date(),
        };
        set((state) => ({
          events: [newEvent, ...state.events].slice(0, 200),
        }));
      },

      addAction: (action) => {
        set((state) => ({
          currentActions: [...state.currentActions, action],
          status: 'working',
        }));
      },

      updateAction: (actionId, updates) => {
        set((state) => ({
          currentActions: state.currentActions.map((a) =>
            a.id === actionId ? { ...a, ...updates } : a
          ),
        }));
      },

      addDecision: (decision) => {
        const newDecision: AIDecision = {
          ...decision,
          id: generateId(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          status: 'pending',
        };
        set((state) => ({
          pendingDecisions: [newDecision, ...state.pendingDecisions],
          metrics: {
            ...state.metrics,
            pendingDecisions: state.metrics.pendingDecisions + 1,
          },
        }));
      },

      addAlert: (alert) => {
        const newAlert: AIAlert = {
          ...alert,
          id: generateId(),
          createdAt: new Date(),
          acknowledged: false,
        };
        set((state) => ({
          alerts: [newAlert, ...state.alerts].slice(0, 50),
          metrics: {
            ...state.metrics,
            activeAlerts: state.metrics.activeAlerts + 1,
          },
        }));
      },
    }),
    {
      name: 'inmoai-admin-ai-store',
      partialize: (state) => ({
        config: state.config,
        actionHistory: state.actionHistory.slice(0, 50),
        events: state.events.slice(0, 100),
        alerts: state.alerts.filter((a) => !a.acknowledged).slice(0, 20),
      }),
    }
  )
);
