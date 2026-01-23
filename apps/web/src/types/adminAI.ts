/**
 * Admin AI Control Types
 * Defines the types for the AI control system with Lazy/Active modes
 */

// AI Operation Modes
export type AIMode = 'lazy' | 'active' | 'autonomous';

// AI Status
export type AIStatus = 'idle' | 'working' | 'waiting' | 'error' | 'paused';

// Delegable AI Functions
export type AIFunction =
  | 'scraping'
  | 'fraud_detection'
  | 'price_analysis'
  | 'moderation'
  | 'user_support'
  | 'seo_optimization';

// AI Function Configuration
export interface AIFunctionConfig {
  id: AIFunction;
  name: string;
  description: string;
  enabled: boolean;
  mode: AIMode;
  schedule?: string; // Cron expression for scheduled tasks
  lastRun?: Date;
  nextRun?: Date;
  stats: {
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    avgDuration: number; // in ms
  };
}

// AI Action
export interface AIAction {
  id: string;
  function: AIFunction;
  type: 'manual' | 'scheduled' | 'automatic';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  result?: AIActionResult;
  error?: string;
  metadata?: Record<string, unknown>;
}

// AI Action Result
export interface AIActionResult {
  success: boolean;
  itemsProcessed: number;
  itemsAffected: number;
  duration: number; // in ms
  details?: string;
  data?: unknown;
}

// AI Event
export interface AIEvent {
  id: string;
  type: 'start' | 'complete' | 'error' | 'alert' | 'decision';
  function: AIFunction;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  data?: unknown;
}

// AI Decision (requires admin approval in lazy mode)
export interface AIDecision {
  id: string;
  function: AIFunction;
  action: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  data?: unknown;
}

// AI Metrics
export interface AIMetrics {
  mode: AIMode;
  status: AIStatus;
  uptime: number; // in seconds
  actionsToday: number;
  actionsThisWeek: number;
  successRate: number; // percentage
  avgResponseTime: number; // in ms
  pendingDecisions: number;
  activeAlerts: number;
  lastActivity?: Date;
}

// AI Alert
export interface AIAlert {
  id: string;
  function: AIFunction;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// AI Configuration
export interface AIConfig {
  mode: AIMode;
  autoApproveThreshold: number; // Only approve automatically below this impact level
  maxConcurrentActions: number;
  notifyOnAction: boolean;
  notifyOnError: boolean;
  pauseOnError: boolean;
  functions: Record<AIFunction, AIFunctionConfig>;
}

// Store State
export interface AdminAIState {
  // Configuration
  config: AIConfig;

  // Status
  status: AIStatus;
  currentActions: AIAction[];

  // History
  actionHistory: AIAction[];
  events: AIEvent[];

  // Pending decisions
  pendingDecisions: AIDecision[];

  // Alerts
  alerts: AIAlert[];

  // Metrics
  metrics: AIMetrics;

  // Actions
  setMode: (mode: AIMode) => void;
  setFunctionEnabled: (func: AIFunction, enabled: boolean) => void;
  setFunctionMode: (func: AIFunction, mode: AIMode) => void;

  triggerAction: (func: AIFunction) => Promise<void>;
  cancelAction: (actionId: string) => void;

  approveDecision: (decisionId: string) => void;
  rejectDecision: (decisionId: string) => void;

  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;

  pause: () => void;
  resume: () => void;

  // Internal
  addEvent: (event: Omit<AIEvent, 'id' | 'timestamp'>) => void;
  addAction: (action: AIAction) => void;
  updateAction: (actionId: string, updates: Partial<AIAction>) => void;
  addDecision: (decision: Omit<AIDecision, 'id' | 'createdAt' | 'status'>) => void;
  addAlert: (alert: Omit<AIAlert, 'id' | 'createdAt' | 'acknowledged'>) => void;
}

// Default function configurations
export const DEFAULT_FUNCTION_CONFIGS: Record<AIFunction, Omit<AIFunctionConfig, 'id'>> = {
  scraping: {
    name: 'Scraping',
    description: 'Extraccion automatica de listings de portales inmobiliarios',
    enabled: true,
    mode: 'lazy',
    schedule: '0 */6 * * *', // Every 6 hours
    stats: { totalRuns: 0, successRuns: 0, failedRuns: 0, avgDuration: 0 },
  },
  fraud_detection: {
    name: 'Deteccion de Fraude',
    description: 'Analisis de listings para detectar posibles fraudes',
    enabled: true,
    mode: 'lazy',
    stats: { totalRuns: 0, successRuns: 0, failedRuns: 0, avgDuration: 0 },
  },
  price_analysis: {
    name: 'Analisis de Precios',
    description: 'Deteccion de precios anomalos y tendencias de mercado',
    enabled: true,
    mode: 'lazy',
    stats: { totalRuns: 0, successRuns: 0, failedRuns: 0, avgDuration: 0 },
  },
  moderation: {
    name: 'Moderacion',
    description: 'Revision de contenido e imagenes de listings',
    enabled: false,
    mode: 'lazy',
    stats: { totalRuns: 0, successRuns: 0, failedRuns: 0, avgDuration: 0 },
  },
  user_support: {
    name: 'Soporte al Usuario',
    description: 'Respuestas automaticas a preguntas frecuentes',
    enabled: false,
    mode: 'lazy',
    stats: { totalRuns: 0, successRuns: 0, failedRuns: 0, avgDuration: 0 },
  },
  seo_optimization: {
    name: 'Optimizacion SEO',
    description: 'Mejora automatica de meta tags y contenido',
    enabled: false,
    mode: 'lazy',
    stats: { totalRuns: 0, successRuns: 0, failedRuns: 0, avgDuration: 0 },
  },
};
