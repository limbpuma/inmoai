# AI Control System - Documentacion

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Web)                  │
│                                                  │
│  useAdminAI ──┐                                  │
│  useAIEvents ─┤── adminAIStore (Zustand)         │
│  useAITriggers┤       │                          │
│  useAIMetrics ┘       │                          │
│                  useAIWebSocket                   │
│                       │ WebSocket                 │
├───────────────────────┼─────────────────────────┤
│                  Backend (API)                    │
│                       │                          │
│              AIEventBroadcaster                   │
│                       │                          │
│              AIOrchestrator                       │
│              ┌────────┼────────┐                 │
│              │        │        │                 │
│         FraudDetection │  PriceAnalysis           │
│                  ScrapingScheduler                │
└─────────────────────────────────────────────────┘
```

## Modos de Operacion

| Modo | Comportamiento | Uso recomendado |
|------|---------------|-----------------|
| **Lazy** | Encola tareas para aprobacion admin | Produccion inicial, control total |
| **Active** | Ejecuta tareas automaticamente | Operacion normal, confianza media |
| **Autonomous** | Ejecuta y toma decisiones sin intervencion | Sistema maduro, confianza alta |

## Servicios AI Backend

### AIOrchestrator (`orchestrator.ts`)

Coordinador central de todas las operaciones AI.

**Configuracion:**
```typescript
interface OrchestratorConfig {
  mode: AIMode;              // 'lazy' | 'active' | 'autonomous'
  maxConcurrentTasks: number; // Default: 3
  autoApproveThreshold: string;
  retryOnError: boolean;
  maxRetries: number;         // Default: 3
}
```

**Metodos principales:**
- `registerHandler(func, handler)` - Registra un handler para una funcion AI
- `submitTask(func, params, options)` - Envia una tarea para ejecucion
- `approveTask(taskId)` - Aprueba una tarea pendiente (lazy mode)
- `rejectTask(taskId)` - Rechaza una tarea pendiente
- `cancelTask(taskId)` - Cancela una tarea en ejecucion
- `pause()` / `resume()` - Pausa/reanuda el orquestador
- `getStatus()` - Estado actual del sistema
- `getPendingTasks()` - Tareas en cola (lazy mode)

### FraudDetectionService (`fraudDetection.ts`)

Analiza listings para detectar fraude.

**Flags detectados:**
| Flag | Descripcion |
|------|-------------|
| `price_anomaly` | Precio fuera del rango de mercado (>40% desviacion) |
| `copy_paste_description` | Keywords sospechosos o descripcion muy corta |
| `suspicious_contact` | Info de contacto en descripcion (whatsapp, telegram, telefono) |
| `duplicate_images` | Pocas o ninguna imagen (<2) |

**Risk Score:** 0-100 basado en severidad y confianza de cada flag.

**Recomendaciones automaticas:**
- `approve`: riskScore < 40
- `review`: riskScore 40-69
- `reject`: riskScore >= 70

### PriceAnalysisService (`priceAnalysis.ts`)

Analisis de precios y valoracion de mercado.

**Ciudades soportadas:** Madrid, Barcelona, Valencia, Sevilla, Malaga

**Factores de precio:**
| Factor | Impacto |
|--------|---------|
| Parking | +8% |
| Piscina | +12% |
| Jardin | +10% |
| Terraza | +6% |
| Obra nueva | +15% |
| Ascensor | +5% |
| Aire acondicionado | +3% |
| Planta alta (5+) | +4% |
| Planta baja | -3% |
| Zona premium | +15% |

**Confianza:** 60% base, incrementa con datos completos (area +15%, habitaciones +5%, banos +5%, barrio +10%, 5+ imagenes +5%).

### ScrapingSchedulerService (`scrapingScheduler.ts`)

Gestion de pipeline de datos automatizado.

**Metodos:**
- `getSources()` - Lista fuentes configuradas
- `updateSource(id, updates)` - Actualiza configuracion de fuente
- `setSourceEnabled(id, enabled)` - Activa/desactiva fuente
- `runScraping(sourceId)` - Ejecuta scraping de una fuente
- `runAllSources()` - Ejecuta todas las fuentes activas

## API tRPC Endpoints

Router: `ai`

### Procedimientos Admin

| Endpoint | Tipo | Descripcion |
|----------|------|-------------|
| `ai.getStatus` | query | Estado del orquestador |
| `ai.setMode` | mutation | Cambiar modo (lazy/active/autonomous) |
| `ai.triggerFunction` | mutation | Ejecutar una funcion AI |
| `ai.getPendingTasks` | query | Tareas pendientes de aprobacion |
| `ai.approveTask` | mutation | Aprobar tarea pendiente |
| `ai.rejectTask` | mutation | Rechazar tarea pendiente |
| `ai.cancelTask` | mutation | Cancelar tarea en ejecucion |
| `ai.pause` | mutation | Pausar sistema |
| `ai.resume` | mutation | Reanudar sistema |

### Sub-routers

- `ai.scraping.*` - Control del pipeline de datos
- `ai.fraudDetection.*` - Servicio de deteccion de fraude
- `ai.priceAnalysis.*` - Servicio de analisis de precios

## WebSocket Events

Servidor: `ws://localhost:9091/api/ws/ai`

### Tipos de Evento

| Tipo | Datos | Cuando |
|------|-------|--------|
| `status_change` | `{ status, message }` | Cambio de estado del sistema |
| `task_start` | `{ taskId, function }` | Tarea iniciada |
| `task_complete` | `{ taskId, function, success, itemsProcessed, duration }` | Tarea completada |
| `task_error` | `{ taskId, function, error }` | Error en tarea |
| `mode_change` | `{ mode, message }` | Cambio de modo |
| `decision_required` | `{ decisionId, function, description, impact }` | Requiere aprobacion admin |
| `alert` | `{ function, severity, title, message }` | Alerta del sistema |

## Hooks Frontend

### `useAdminAI()`

Hook principal. Retorna estado completo y acciones.

```typescript
const {
  config, status, mode, isWorking, isPaused,
  currentActions, enabledFunctions, pendingCount,
  alerts, unacknowledgedAlerts,
  setMode, switchMode, toggleFunction,
  triggerAction, cancelAction,
  approveDecision, rejectDecision,
  acknowledgeAlert, clearAlerts,
  pause, resume,
} = useAdminAI();
```

### `useAIEvents(options?)`

Eventos filtrados con callback en tiempo real.

```typescript
const {
  events, allEvents, errorEvents, recentEvents,
  totalCount, filteredCount,
  getEventsByFunction, emitEvent,
} = useAIEvents({
  functionFilter: 'fraud_detection',
  severityFilter: 'error',
  limit: 20,
  onEvent: (event) => console.log('Nuevo evento:', event),
});
```

### `useAITriggers()`

Disparo de acciones con tracking de estado.

```typescript
const {
  isTriggering, lastTriggered, error, runningActions,
  trigger, triggerAll, cancelAction, cancelAll,
  isFunctionRunning,
} = useAITriggers();

// Ejecutar una funcion
await trigger('fraud_detection');

// Ejecutar todas las habilitadas
await triggerAll();
```

### `useAIMetrics()`

Metricas de rendimiento computadas.

```typescript
const {
  successRate, avgResponseTime,
  actionsToday, actionsThisWeek, errorsToday,
  totalItemsProcessed, activeTaskCount,
  functionMetrics,   // Array con metricas por funcion
  isHealthy,         // successRate >= 80% && errorsToday < 5
  performanceLabel,  // 'rapido' | 'normal' | 'lento'
} = useAIMetrics();
```

### `useAIWebSocket(options?)`

Conexion WebSocket con auto-reconnect.

```typescript
const {
  connectionStatus, isConnected,
  lastEvent, eventCount,
  connect, disconnect,
  reconnectAttempts,
} = useAIWebSocket({
  url: 'ws://localhost:9091/api/ws/ai',
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  enabled: true,
});
```

## Testing

Ejecutar tests:

```bash
cd apps/api
npx vitest run src/tests/ai.test.ts
```

**Cobertura:** 30 tests cubriendo:
- AIOrchestrator: 9 tests (modos, ejecucion, cola, pausa, cancelacion)
- FraudDetectionService: 10 tests (deteccion, flags, batch, scoring)
- PriceAnalysisService: 11 tests (valoracion, factores, anomalias, mercado)

## Zustand Store

Store persistido en `localStorage` con key `inmoai-admin-ai-store`.

**Estado persistido (parcial):**
- `config` - Configuracion completa
- `actionHistory` - Ultimas 50 acciones
- `events` - Ultimos 100 eventos
- `alerts` - Hasta 20 alertas no reconocidas
