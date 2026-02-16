# InmoAI

Plataforma inmobiliaria AI-First para el mercado español. Combina inteligencia artificial con agregación de propiedades, marketplace de servicios, y automatización de contenido en redes sociales.

## Arquitectura

Monorepo gestionado con **Turborepo** y **npm workspaces**.

```
inmoai/
├── apps/
│   ├── api/          # Backend - Next.js + tRPC + Drizzle ORM
│   ├── web/          # Frontend - Next.js 16 + React 19 + Tailwind 4
│   └── mcp-server/   # Servidor MCP para integración con LLMs
└── packages/
    └── shared/       # Tipos y utilidades compartidas
```

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Zustand |
| Backend | Next.js API Routes, tRPC 11, Drizzle ORM |
| Base de datos | PostgreSQL |
| Auth | NextAuth v5 (beta) |
| Pagos | Stripe (suscripciones + pagos únicos) |
| AI | OpenAI, Google Generative AI |
| Monorepo | Turborepo, npm workspaces |
| Testing | Vitest |

## Funcionalidades Principales

### Propiedades e Inteligencia AI
- Agregación de listados de múltiples fuentes
- Análisis AI: títulos, descripciones, highlights, detección de problemas
- Scoring de autenticidad y calidad por propiedad
- Estimación de valoración con nivel de confianza
- Historial de precios y análisis de imágenes
- Verificación catastral (Registro de la Propiedad español)

### Sistema de Agentes AI
- Orquestador central con handlers especializados
- Detección de fraude (`fraudDetection`)
- Análisis de precios (`priceAnalysis`)
- Pipeline de datos automatizado (`scrapingScheduler`)
- Sesiones de agente con contexto persistente
- Facturación basada en resultados (outcome-based billing)
- API keys B2B para agentes externos

### Marketplace de Servicios
- Conexión entre propietarios y proveedores de servicios (reformas, notarías, abogados)
- Sistema de tiers: free / premium / enterprise
- Distribución de leads por zona geográfica
- Reviews multidimensionales (calidad, comunicación, puntualidad, valor)
- Portfolio de proyectos con imágenes antes/después

### Redes Sociales
- OAuth con Facebook, Instagram, LinkedIn, TikTok, Twitter
- Generación AI de copy, hashtags y contenido de marketing
- Publicación automatizada con tracking de analytics
- Workflows de auto-posting con triggers configurables

### Directorio Profesional
- Categorías: notarías, abogados, gestorías, contratistas
- Listings gratuitos, destacados y premium
- Sistema de reviews y reputación

## Requisitos

- Node.js >= 20.0.0
- PostgreSQL 15+
- npm 10+

## Instalación

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

# Seed de datos iniciales (opcional)
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
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia API y Web en paralelo |
| `npm run build` | Build de producción |
| `npm run lint` | Linting en todos los workspaces |
| `npm run typecheck` | Verificación de tipos TypeScript |
| `npm run db:push` | Sincronizar schema con la DB |
| `npm run db:studio` | Abrir Drizzle Studio |
| `npm run clean` | Limpiar builds y node_modules |

## API (tRPC Routers)

El backend expone 15 routers tipados:

| Router | Dominio |
|--------|---------|
| `admin` | Panel de administración y reportes |
| `agents` | Gestión de agentes AI |
| `ai` | Servicios de análisis AI |
| `auth` | Autenticación y sesiones |
| `billing` | Suscripciones y facturación Stripe |
| `cadastre` | Integración con el Catastro español |
| `content` | Generación y publicación de contenido |
| `escrow` | Transacciones en custodia |
| `listings` | CRUD y búsqueda de propiedades |
| `marketplace` | Proveedores de servicios y leads |
| `onboarding` | Flujo de alta de usuarios |
| `search` | Búsqueda avanzada con filtros |
| `settings` | Preferencias y configuración |
| `social` | Redes sociales y analytics |
| `users` | Gestión de perfiles de usuario |

## Servidor MCP

`apps/mcp-server` implementa el protocolo Model Context Protocol para integración directa con Claude y otros LLMs, habilitando:

- Consultas de propiedades desde el agente
- Análisis de mercado en tiempo real
- Automatización de workflows

## Estructura de la Base de Datos

50+ tablas organizadas por dominio:

- **Propiedades**: listings, listingImages, priceHistory, sources
- **Usuarios**: users, accounts, sessions, apiKeys
- **AI**: aiWorkflows, agentSessions, agentTransactions, agentUsage, aiGeneratedContent
- **Marketplace**: serviceProviders, providerServices, serviceLeads, providerReviews, providerPortfolio
- **Pagos**: escrow, suscripciones Stripe
- **Social**: socialConnections, socialPosts
- **Sistema**: systemSettings, activityLog, systemAlerts, scrapingJobs

## Licencia

Privado - Todos los derechos reservados.
