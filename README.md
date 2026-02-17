# InmoAI

Plataforma inmobiliaria AI-First para el mercado espanol. Combina inteligencia artificial con agregacion de propiedades, marketplace de servicios, directorio profesional y automatizacion de contenido en redes sociales.

## Arquitectura

Monorepo gestionado con **Turborepo** y **npm workspaces**.

```
inmoai/
├── apps/
│   ├── api/          # Backend - Next.js + tRPC 11 + Drizzle ORM
│   ├── web/          # Frontend - Next.js 16 + React 19 + Tailwind 4
│   └── mcp-server/   # Servidor MCP para integracion con LLMs
├── packages/
│   └── shared/       # Tipos y utilidades compartidas
└── docs/
    └── AI_CONTROL.md # Documentacion del sistema de control AI
```

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Zustand |
| Backend | Next.js API Routes, tRPC 11, Drizzle ORM |
| Base de datos | PostgreSQL (50+ tablas, 2300+ lineas de schema) |
| Auth | NextAuth v5 (beta) con roles: user, premium, agency, admin |
| Pagos | Stripe (suscripciones + outcome-based billing) |
| AI | OpenAI, Google Generative AI |
| Real-time | WebSocket (AIEventBroadcaster) |
| Monorepo | Turborepo, npm workspaces |
| Testing | Vitest (30 tests AI) |

## Funcionalidades Principales

### Propiedades e Inteligencia AI
- Agregacion de listados desde 8 fuentes (InmoAI, Idealista, Fotocasa, Habitaclia, Pisos.com, etc.)
- Analisis AI: titulos, descripciones, highlights, deteccion de problemas
- Scoring de autenticidad y calidad por propiedad
- Estimacion de valoracion con nivel de confianza
- Historial de precios con deteccion de tendencias
- Verificacion catastral (Catastro espanol)
- Sugerencias de mejoras detectadas por AI con estimacion de coste/ROI

### Sistema de Control AI
- **Orquestador central** con 3 modos: lazy (aprobacion manual), active (automatico), autonomous (sin intervencion)
- **Deteccion de fraude**: precio anomalo, keywords sospechosos, contacto en descripcion, imagenes insuficientes
- **Analisis de precios**: valoracion por m2 con factores (parking +8%, piscina +12%, zona premium +15%)
- **Pipeline de datos**: scraping programado con rate limiting
- **WebSocket en tiempo real**: eventos de tareas, alertas, cambios de modo
- 5 hooks frontend: `useAdminAI`, `useAIEvents`, `useAITriggers`, `useAIMetrics`, `useAIWebSocket`

### Sistema de Agentes AI
- 11 tipos de agente especializados (search, verify, negotiate, valuation, social_media, content, etc.)
- Sesiones con contexto persistente y historial de conversacion
- Facturacion basada en resultados (outcome-based billing)
- API keys B2B con rate limiting y pricing por tier
- Sistema de escrow para transacciones inmobiliarias

### Marketplace de Servicios
- Conexion entre propietarios y proveedores (reformas, fontaneria, electricidad, jardineria, pintura)
- Sistema de tiers: free / premium / enterprise
- Distribucion de leads por zona geografica y radio de cobertura
- Reviews multidimensionales (calidad, comunicacion, puntualidad, valor)
- Portfolio de proyectos con imagenes y costes

### Directorio Profesional
- 12 categorias: notarias, abogados, gestorias, renovacion, mudanzas, limpieza, seguros, tasacion, brokers hipotecarios, arquitectos, diseno interior, agencias
- Listings gratuitos, destacados y premium
- Datos acumulados: reviews, tasa de completado, tiempo de respuesta, transacciones
- Verificacion con documentos y licencias
- Especializaciones y audiencia objetivo

### Redes Sociales y Contenido
- OAuth con Facebook, Instagram, LinkedIn, TikTok, Twitter
- Generacion AI de 10 tipos de contenido (descripcion, social post, hashtags, ad copy, video script, SEO)
- Publicacion automatizada con tracking de analytics
- Workflows con 7 tipos de trigger (listing creado, precio cambiado, lead recibido, etc.)

## Seed Data

El proyecto incluye datos masivos de prueba que cubren todo el ecosistema:

| Datos | Cantidad | Detalle |
|-------|----------|---------|
| Usuarios | 20 | Admin, premium, agencias, regulares |
| Fuentes | 8 | InmoAI nativo + 4 portales espanoles |
| Propiedades | ~155 | 6 ciudades, venta + alquiler, todos los tipos |
| Imagenes | ~500+ | 2-5 por propiedad con tipos de habitacion |
| Historial precios | ~250+ | Con bajadas para propiedades antiguas |
| Proveedores | 22 | Reformas, pintura, electricidad, fontaneria, jardineria |
| Directorio | 35 | Notarias, abogados, gestorias, hipotecas, arquitectos |
| Leads | 100 | Property leads + service leads |
| Reviews | 220+ | Proveedores + directorio, multidimensionales |
| Centroides | ~60 | GPS por ciudad y barrio para geolookup |

**Ciudades:** Madrid, Barcelona, Valencia, Sevilla, Malaga, Bilbao

```bash
# Ejecutar seed
npm run db:seed --workspace=apps/api
```

## Requisitos

- Node.js >= 20.0.0
- PostgreSQL 15+
- npm 10+

## Instalacion

```bash
# Clonar el repositorio
git clone https://github.com/limbpuma/inmoai.git
cd inmoai

# Instalar dependencias
npm install

# Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Editar los archivos .env con tus credenciales

# Inicializar la base de datos
npm run db:push

# Seed de datos (recomendado)
npm run db:seed --workspace=apps/api
```

## Desarrollo

```bash
# Levantar todo el monorepo (API + Web)
npm run dev

# Solo API (puerto 9091)
npm run dev:api

# Solo Web (puerto 9090)
npm run dev:web

# Drizzle Studio (explorar DB)
npm run db:studio

# Tests AI
cd apps/api && npx vitest run src/tests/ai.test.ts
```

## Scripts Disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia API y Web en paralelo |
| `npm run build` | Build de produccion |
| `npm run lint` | Linting en todos los workspaces |
| `npm run typecheck` | Verificacion de tipos TypeScript |
| `npm run db:push` | Sincronizar schema con la DB |
| `npm run db:studio` | Abrir Drizzle Studio |
| `npm run clean` | Limpiar builds y node_modules |

## API (tRPC Routers)

El backend expone 15 routers tipados:

| Router | Dominio |
|--------|---------|
| `admin` | Panel de administracion, reportes y metricas |
| `agents` | Gestion de agentes AI y sesiones |
| `ai` | Orquestador AI, fraude, precios, scraping |
| `auth` | Autenticacion NextAuth y sesiones |
| `billing` | Suscripciones Stripe y facturacion |
| `cadastre` | Integracion con el Catastro espanol |
| `content` | Generacion AI de contenido marketing |
| `escrow` | Transacciones en custodia |
| `listings` | CRUD y busqueda de propiedades |
| `marketplace` | Proveedores de servicios, leads, reviews |
| `onboarding` | Flujo de alta de usuarios |
| `search` | Busqueda avanzada con filtros |
| `settings` | Preferencias y configuracion |
| `social` | Redes sociales, posts y analytics |
| `users` | Gestion de perfiles de usuario |

## Hooks Frontend

| Hook | Proposito |
|------|-----------|
| `useAdminAI` | Estado completo del sistema AI y acciones admin |
| `useAIEvents` | Stream de eventos filtrados con callbacks |
| `useAITriggers` | Disparo de funciones AI con tracking |
| `useAIMetrics` | Metricas de rendimiento computadas |
| `useAIWebSocket` | Conexion WebSocket con auto-reconnect |
| `useBilling` | Gestion de suscripciones Stripe |
| `useSearch` | Busqueda de propiedades con filtros |
| `useVoiceSearch` | Busqueda por voz |
| `useSemanticSearchFlow` | Busqueda semantica AI |
| `useDebounce` | Debounce generico |

## Servidor MCP

`apps/mcp-server` implementa el protocolo Model Context Protocol para integracion directa con Claude y otros LLMs:

- Consultas de propiedades desde el agente
- Analisis de mercado en tiempo real
- Automatizacion de workflows
- Acceso al directorio profesional

## Estructura de la Base de Datos

50+ tablas organizadas por dominio (2300+ lineas de schema Drizzle):

- **Propiedades**: listings, listingImages, priceHistory, sources, scrapingJobs
- **Usuarios**: users, accounts, sessions, apiKeys, userFavorites, searchAlerts
- **AI Agentes**: agentSessions, agentTransactions, agentUsage, agentApiKeys, aiGeneratedContent, aiWorkflows, workflowExecutions
- **Marketplace**: serviceProviders, providerServices, serviceLeads, providerReviews, providerPortfolio, areaCentroids
- **Directorio**: businessDirectory, businessReviews
- **Pagos**: escrow, suscripciones Stripe integradas en users/providers
- **Social**: socialConnections, socialPosts, notifications
- **Sistema**: systemSettings, activityLog, systemAlerts
- **Leads**: leads (propiedades), serviceLeads (servicios)

## Testing

```bash
# 30 tests AI (orchestrator, fraud detection, price analysis)
cd apps/api && npx vitest run src/tests/ai.test.ts
```

Cobertura actual:
- AIOrchestrator: 9 tests (modos, ejecucion, cola, pausa, cancelacion)
- FraudDetectionService: 10 tests (deteccion, flags, batch, scoring)
- PriceAnalysisService: 11 tests (valoracion, factores, anomalias, mercado)

## Licencia

Privado - Todos los derechos reservados.
