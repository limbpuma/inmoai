# InmoAI - Roadmap de Implementacion

**Version:** 0.2.0
**Fecha:** 2026-01-23
**Estado:** En Desarrollo

---

## Vision General

Implementar un Panel de Administracion con control total del sistema y un sistema de IA en "Lazy Mode" que permite al administrador delegar funciones especificas a la inteligencia artificial.

---

## Arquitectura del Sistema IA

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                          │
│                      /admin/*                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Metricas   │  │  Usuarios   │  │  Listings   │         │
│  │  Dashboard  │  │  Management │  │  Management │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Scraping   │  │   Stripe    │  │   Sistema   │         │
│  │   Control   │  │   Billing   │  │    Logs     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                   AI CONTROL CENTER                         │
│              (Lazy Mode / Active Mode)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                 AdminAIOrchestrator                   │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  adminAIStore (Zustand)                         │  │ │
│  │  │  ├── mode: 'lazy' | 'active' | 'autonomous'     │  │ │
│  │  │  ├── delegatedFunctions: string[]               │  │ │
│  │  │  ├── status: 'idle' | 'working' | 'waiting'     │  │ │
│  │  │  ├── lastAction: timestamp                      │  │ │
│  │  │  └── actionHistory: AIAction[]                  │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                       │ │
│  │  Hooks:                                               │ │
│  │  ├── useAdminAI() - Estado y acciones principales    │ │
│  │  ├── useAIEvents() - Escucha eventos del sistema     │ │
│  │  ├── useAITriggers() - Dispara acciones IA           │ │
│  │  └── useAIMetrics() - Metricas de rendimiento IA     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Funciones Delegables a IA

| Funcion | Lazy Mode | Active Mode | Descripcion |
|---------|-----------|-------------|-------------|
| **Scraping** | Manual | Auto c/6h | Extraccion de portales inmobiliarios |
| **Fraud Detection** | Alerta admin | Auto-oculta | Deteccion de listings fraudulentos |
| **Price Analysis** | Sugerencias | Auto-ajusta | Analisis de precios de mercado |
| **Moderation** | Flag revision | Auto-modera | Moderacion de contenido/imagenes |
| **User Support** | Notifica | Auto-responde | Respuestas a FAQs de usuarios |
| **SEO Optimization** | Reportes | Auto-optimiza | Mejora de meta tags y contenido |

---

## Fases de Implementacion

### Fase 1: Infraestructura Base
**Commits: 5-8**

#### Commit 5: Auth + Roles
- [ ] Implementar NextAuth con Supabase provider
- [ ] Crear middleware de proteccion de rutas
- [ ] Definir roles: user, premium, agency, admin
- [ ] Crear paginas /login, /register

**Archivos:**
```
apps/web/src/app/api/auth/[...nextauth]/route.ts
apps/web/src/middleware.ts
apps/web/src/app/(auth)/login/page.tsx
apps/web/src/app/(auth)/register/page.tsx
apps/api/src/server/routers/auth.router.ts
```

#### Commit 6: Stripe Integration
- [ ] Instalar @stripe/stripe-js y stripe
- [ ] Crear productos en Stripe Dashboard
- [ ] Implementar checkout session
- [ ] Webhooks para subscription events
- [ ] Actualizar pagina /pricing con checkout real

**Archivos:**
```
apps/api/src/server/routers/billing.router.ts
apps/api/src/services/stripe.service.ts
apps/web/src/app/api/webhooks/stripe/route.ts
apps/web/src/hooks/useSubscription.ts
```

#### Commit 7: User Dashboard
- [ ] Dashboard basico para usuarios
- [ ] Historial de busquedas
- [ ] Propiedades guardadas (favoritos)
- [ ] Gestion de suscripcion

**Archivos:**
```
apps/web/src/app/(dashboard)/dashboard/page.tsx
apps/web/src/app/(dashboard)/dashboard/favorites/page.tsx
apps/web/src/app/(dashboard)/dashboard/history/page.tsx
apps/web/src/app/(dashboard)/dashboard/subscription/page.tsx
apps/web/src/stores/userStore.ts
```

### Fase 2: Admin Panel Base
**Commits: 8-11**

#### Commit 8: Admin Layout + Metricas
- [ ] Layout admin con sidebar navigation
- [ ] Dashboard con metricas principales
- [ ] Graficos: usuarios, busquedas, listings
- [ ] KPIs: conversion, churn, revenue

**Archivos:**
```
apps/web/src/app/(admin)/admin/layout.tsx
apps/web/src/app/(admin)/admin/page.tsx
apps/web/src/components/admin/AdminSidebar.tsx
apps/web/src/components/admin/MetricsCards.tsx
apps/web/src/components/admin/Charts.tsx
apps/api/src/server/routers/admin.router.ts
```

#### Commit 9: Users Management
- [ ] Tabla de usuarios con filtros
- [ ] CRUD de usuarios
- [ ] Cambio de roles
- [ ] Historial de actividad
- [ ] Ban/suspend users

**Archivos:**
```
apps/web/src/app/(admin)/admin/users/page.tsx
apps/web/src/components/admin/UsersTable.tsx
apps/web/src/components/admin/UserDetailSheet.tsx
apps/api/src/server/routers/users.router.ts
```

#### Commit 10: Listings Management
- [ ] Tabla de listings con filtros
- [ ] Aprobar/rechazar listings
- [ ] Editar listings
- [ ] Ver estadisticas por listing
- [ ] Bulk actions

**Archivos:**
```
apps/web/src/app/(admin)/admin/listings/page.tsx
apps/web/src/components/admin/ListingsTable.tsx
apps/web/src/components/admin/ListingDetailSheet.tsx
```

#### Commit 11: System Logs + Settings
- [ ] Visor de logs del sistema
- [ ] Configuracion general
- [ ] Feature flags
- [ ] Mantenimiento mode

**Archivos:**
```
apps/web/src/app/(admin)/admin/logs/page.tsx
apps/web/src/app/(admin)/admin/settings/page.tsx
apps/web/src/components/admin/LogsViewer.tsx
apps/api/src/server/routers/settings.router.ts
```

### Fase 3: AI Control System (Lazy Mode)
**Commits: 12-16**

#### Commit 12: AdminAI Store + Types
- [ ] Definir tipos de acciones IA
- [ ] Crear adminAIStore con Zustand
- [ ] Persistencia de configuracion
- [ ] Estados: idle, working, waiting, error

**Archivos:**
```
apps/web/src/types/adminAI.ts
apps/web/src/stores/adminAIStore.ts
packages/shared/src/types/ai.ts
```

#### Commit 13: AI Control Panel UI
- [ ] Pagina /admin/ai-control
- [ ] Toggle Lazy/Active mode
- [ ] Panel de funciones delegables
- [ ] Indicadores de estado en tiempo real
- [ ] Historial de acciones IA

**Archivos:**
```
apps/web/src/app/(admin)/admin/ai-control/page.tsx
apps/web/src/components/admin/AIControlPanel.tsx
apps/web/src/components/admin/AIFunctionCard.tsx
apps/web/src/components/admin/AIStatusIndicator.tsx
apps/web/src/components/admin/AIActionHistory.tsx
```

#### Commit 14: AI Hooks + Events
- [ ] useAdminAI hook principal
- [ ] useAIEvents para escuchar eventos
- [ ] useAITriggers para disparar acciones
- [ ] useAIMetrics para metricas

**Archivos:**
```
apps/web/src/hooks/useAdminAI.ts
apps/web/src/hooks/useAIEvents.ts
apps/web/src/hooks/useAITriggers.ts
apps/web/src/hooks/useAIMetrics.ts
```

#### Commit 15: AI Backend Services
- [ ] AIOrchestrator service
- [ ] Fraud detection service
- [ ] Price analysis service
- [ ] Scraping scheduler service
- [ ] tRPC router para AI

**Archivos:**
```
apps/api/src/services/ai/orchestrator.service.ts
apps/api/src/services/ai/fraudDetection.service.ts
apps/api/src/services/ai/priceAnalysis.service.ts
apps/api/src/services/ai/scrapingScheduler.service.ts
apps/api/src/server/routers/ai.router.ts
```

#### Commit 16: AI Integration + Testing
- [ ] Integrar servicios con UI
- [ ] Websockets para updates en tiempo real
- [ ] Tests de integracion
- [ ] Documentacion de API

**Archivos:**
```
apps/api/src/server/websocket.ts
apps/web/src/hooks/useAIWebSocket.ts
apps/api/src/tests/ai.test.ts
docs/AI_CONTROL.md
```

---

## Dependencias Requeridas

### Backend (apps/api)
```json
{
  "stripe": "^14.x",
  "next-auth": "^5.x",
  "@auth/drizzle-adapter": "^1.x",
  "bullmq": "^5.x",
  "ioredis": "^5.x"
}
```

### Frontend (apps/web)
```json
{
  "@stripe/stripe-js": "^2.x",
  "next-auth": "^5.x",
  "recharts": "^2.x",
  "@tanstack/react-table": "^8.x",
  "socket.io-client": "^4.x"
}
```

---

## Criterios de Aceptacion

### Fase 1
- [ ] Usuario puede registrarse y hacer login
- [ ] Usuario puede suscribirse via Stripe
- [ ] Webhooks procesan eventos correctamente
- [ ] Dashboard muestra datos del usuario

### Fase 2
- [ ] Admin puede ver metricas del sistema
- [ ] Admin puede gestionar usuarios
- [ ] Admin puede gestionar listings
- [ ] Sistema de logs funcional

### Fase 3
- [ ] Toggle Lazy/Active mode funciona
- [ ] IA ejecuta acciones delegadas
- [ ] Historial de acciones visible
- [ ] Metricas de rendimiento IA

---

## Notas Tecnicas

1. **Async/Non-blocking**: Todas las operaciones IA deben ser asincronas
2. **Rate Limiting**: Implementar limits para acciones IA
3. **Audit Trail**: Registrar todas las acciones automaticas
4. **Rollback**: Permitir revertir acciones IA
5. **Notifications**: Alertas cuando IA toma acciones importantes

---

## Referencias

- [ihk-exam-prep-desktop](../ihk-exam-prep-desktop) - Patron CoachOrchestrator
- [Stripe Docs](https://stripe.com/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [BullMQ](https://docs.bullmq.io/) - Job queues
