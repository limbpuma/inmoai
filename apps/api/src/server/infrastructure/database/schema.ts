import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const propertyTypeEnum = pgEnum('property_type', [
  'apartment',
  'house',
  'studio',
  'penthouse',
  'duplex',
  'loft',
  'villa',
  'chalet',
  'townhouse',
  'land',
  'commercial',
  'office',
  'garage',
  'storage',
]);

export const operationTypeEnum = pgEnum('operation_type', ['sale', 'rent']);

export const listingStatusEnum = pgEnum('listing_status', [
  'active',
  'inactive',
  'expired',
  'sold',
  'rented',
  'pending',
]);

export const roomTypeEnum = pgEnum('room_type', [
  'living_room',
  'bedroom',
  'bathroom',
  'kitchen',
  'dining_room',
  'terrace',
  'balcony',
  'garden',
  'garage',
  'storage',
  'hallway',
  'office',
  'other',
]);

export const userRoleEnum = pgEnum('user_role', ['user', 'premium', 'agency', 'admin']);

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
]);

// ============================================
// SOURCES (Portales de origen)
// ============================================

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  baseUrl: varchar('base_url', { length: 500 }),
  website: varchar('website', { length: 500 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  scrapingEnabled: boolean('scraping_enabled').default(true),
  scrapingIntervalHours: integer('scraping_interval_hours').default(24),
  lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }),
  config: jsonb('config').$type<{
    selectors?: Record<string, string>;
    headers?: Record<string, string>;
    rateLimit?: number;
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// LISTINGS (Propiedades)
// ============================================

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Identificación externa
    externalId: varchar('external_id', { length: 255 }),
    sourceId: uuid('source_id').references(() => sources.id),
    externalUrl: varchar('external_url', { length: 1000 }),
    canonicalId: uuid('canonical_id'), // Para duplicados

    // Datos básicos
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    propertyType: propertyTypeEnum('property_type').notNull(),
    operationType: operationTypeEnum('operation_type').notNull(),

    // Ubicación
    address: varchar('address', { length: 500 }),
    city: varchar('city', { length: 100 }),
    neighborhood: varchar('neighborhood', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    province: varchar('province', { length: 100 }),
    country: varchar('country', { length: 100 }).default('España'),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),

    // Características
    price: decimal('price', { precision: 12, scale: 2 }),
    pricePerSqm: decimal('price_per_sqm', { precision: 10, scale: 2 }),
    sizeSqm: integer('size_sqm'),
    usableSizeSqm: integer('usable_size_sqm'),
    rooms: integer('rooms'),
    bedrooms: integer('bedrooms'),
    bathrooms: integer('bathrooms'),
    floor: integer('floor'),
    totalFloors: integer('total_floors'),
    hasElevator: boolean('has_elevator'),
    hasParking: boolean('has_parking'),
    hasTerrace: boolean('has_terrace'),
    hasBalcony: boolean('has_balcony'),
    hasGarden: boolean('has_garden'),
    hasPool: boolean('has_pool'),
    hasAirConditioning: boolean('has_air_conditioning'),
    hasHeating: boolean('has_heating'),
    heatingType: varchar('heating_type', { length: 100 }),
    orientation: varchar('orientation', { length: 50 }),
    yearBuilt: integer('year_built'),
    energyRating: varchar('energy_rating', { length: 1 }),

    // Análisis IA
    aiTitle: varchar('ai_title', { length: 500 }),
    aiDescription: text('ai_description'),
    aiHighlights: jsonb('ai_highlights').$type<string[]>(),
    aiIssues: jsonb('ai_issues').$type<
      {
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
        location?: string;
      }[]
    >(),
    authenticityScore: integer('authenticity_score'),
    isAiGenerated: boolean('is_ai_generated'),
    isEdited: boolean('is_edited'),
    qualityScore: integer('quality_score'),
    valuationEstimate: decimal('valuation_estimate', { precision: 12, scale: 2 }),
    valuationConfidence: decimal('valuation_confidence', { precision: 3, scale: 2 }),

    // AI-detected improvement suggestions (future marketplace feature)
    improvements: jsonb('improvements').$type<
      {
        id: string;
        category: 'painting' | 'renovation' | 'electrical' | 'plumbing' | 'garden' | 'general';
        title: string;
        description: string;
        estimatedCost: { min: number; max: number };
        potentialValueIncrease: number;
        priority: 'low' | 'medium' | 'high';
        detectedFrom?: string;
      }[]
    >(),

    // Vector embedding reference
    embeddingId: varchar('embedding_id', { length: 100 }),

    // Cadastral verification (KEY DIFFERENTIATOR)
    cadastralRef: varchar('cadastral_ref', { length: 20 }),
    cadastralVerified: boolean('cadastral_verified').default(false),
    cadastralVerifiedAt: timestamp('cadastral_verified_at', { withTimezone: true }),
    cadastralSurface: integer('cadastral_surface'), // Official m²
    cadastralUse: varchar('cadastral_use', { length: 50 }),
    cadastralConstructionYear: integer('cadastral_construction_year'),
    cadastralMismatch: jsonb('cadastral_mismatch').$type<{
      fields: string[];
      details: string;
      severity: 'low' | 'medium' | 'high';
    }>(),

    // Estado y fechas
    status: listingStatusEnum('status').default('active'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
    lastEnrichedAt: timestamp('last_enriched_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_listings_source_external').on(table.sourceId, table.externalId),
    index('idx_listings_city').on(table.city),
    index('idx_listings_price').on(table.price),
    index('idx_listings_size').on(table.sizeSqm),
    index('idx_listings_status').on(table.status),
    index('idx_listings_authenticity').on(table.authenticityScore),
    index('idx_listings_property_type').on(table.propertyType),
    index('idx_listings_operation_type').on(table.operationType),
    index('idx_listings_cadastral_ref').on(table.cadastralRef),
    index('idx_listings_cadastral_verified').on(table.cadastralVerified),
  ]
);

// ============================================
// LISTING IMAGES
// ============================================

export const listingImages = pgTable(
  'listing_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .references(() => listings.id, { onDelete: 'cascade' })
      .notNull(),

    originalUrl: varchar('original_url', { length: 1000 }).notNull(),
    cdnUrl: varchar('cdn_url', { length: 1000 }),
    thumbnailUrl: varchar('thumbnail_url', { length: 1000 }),
    position: integer('position').default(0),

    // Análisis IA
    roomType: roomTypeEnum('room_type'),
    isAiGenerated: boolean('is_ai_generated'),
    isEdited: boolean('is_edited'),
    authenticityScore: integer('authenticity_score'),
    qualityScore: integer('quality_score'),
    detectedIssues: jsonb('detected_issues').$type<
      {
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      }[]
    >(),

    // Deduplicación
    hash: varchar('hash', { length: 64 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_images_listing').on(table.listingId),
    index('idx_images_hash').on(table.hash),
  ]
);

// ============================================
// PRICE HISTORY
// ============================================

export const priceHistory = pgTable(
  'price_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .references(() => listings.id, { onDelete: 'cascade' })
      .notNull(),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_price_history_listing').on(table.listingId, table.recordedAt)]
);

// ============================================
// USERS (NextAuth compatible)
// ============================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    image: varchar('image', { length: 500 }),
    emailVerified: timestamp('email_verified', { withTimezone: true }),
    hashedPassword: varchar('hashed_password', { length: 255 }),
    role: userRoleEnum('role').default('user'),

    // Subscription info
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    stripeCurrentPeriodEnd: timestamp('stripe_current_period_end', { withTimezone: true }),

    // AI Credits - Anti-SaaSpocalypse: outcome-based pricing
    // Tracks monthly AI usage to enforce plan limits
    aiCreditsUsedThisMonth: integer('ai_credits_used_this_month').default(0),
    aiCreditsResetDate: timestamp('ai_credits_reset_date', { withTimezone: true }),

    // Preferences
    preferences: jsonb('preferences').$type<{
      defaultCity?: string;
      priceRange?: { min?: number; max?: number };
      notifications?: {
        email?: boolean;
        push?: boolean;
      };
    }>(),

    // Agency info (if role is agency)
    agencyName: varchar('agency_name', { length: 255 }),
    agencyPhone: varchar('agency_phone', { length: 50 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_users_email').on(table.email), index('idx_users_role').on(table.role)]
);

// ============================================
// AUTH: ACCOUNTS (NextAuth)
// ============================================

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (table) => [
    uniqueIndex('idx_accounts_provider').on(table.provider, table.providerAccountId),
    index('idx_accounts_user').on(table.userId),
  ]
);

// ============================================
// AUTH: SESSIONS (NextAuth)
// ============================================

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => [index('idx_sessions_user').on(table.userId)]
);

// ============================================
// AUTH: VERIFICATION TOKENS (NextAuth)
// ============================================

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex('idx_verification_tokens').on(table.identifier, table.token)]
);

// ============================================
// USER FAVORITES
// ============================================

export const userFavorites = pgTable(
  'user_favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    listingId: uuid('listing_id')
      .references(() => listings.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_favorites_user_listing').on(table.userId, table.listingId),
    index('idx_favorites_user').on(table.userId),
  ]
);

// ============================================
// SEARCH ALERTS
// ============================================

export const searchAlerts = pgTable(
  'search_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    filters: jsonb('filters').$type<{
      query?: string;
      city?: string;
      neighborhood?: string;
      propertyType?: string[];
      operationType?: string;
      priceMin?: number;
      priceMax?: number;
      sizeMin?: number;
      sizeMax?: number;
      rooms?: number;
      authenticityScoreMin?: number;
    }>(),
    frequency: varchar('frequency', { length: 20 }).default('daily'), // daily, weekly, instant
    isActive: boolean('is_active').default(true),
    lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_alerts_user').on(table.userId), index('idx_alerts_active').on(table.isActive)]
);

// ============================================
// LEADS
// ============================================

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id').references(() => listings.id),
    userId: uuid('user_id').references(() => users.id),

    // Contact info
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    message: text('message'),

    // Status
    status: leadStatusEnum('status').default('new'),

    // Attribution
    source: varchar('source', { length: 100 }), // organic, google, partner
    utmSource: varchar('utm_source', { length: 100 }),
    utmMedium: varchar('utm_medium', { length: 100 }),
    utmCampaign: varchar('utm_campaign', { length: 100 }),

    // Distribution
    distributedTo: uuid('distributed_to').references(() => users.id),
    distributedAt: timestamp('distributed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_leads_listing').on(table.listingId),
    index('idx_leads_status').on(table.status),
    index('idx_leads_distributed').on(table.distributedTo),
  ]
);

// ============================================
// API KEYS (B2B)
// ============================================

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 12 }).notNull(), // hc_live_xxx
    keyHash: varchar('key_hash', { length: 255 }).notNull(),
    scopes: jsonb('scopes').$type<string[]>().default([]),
    rateLimit: integer('rate_limit').default(1000),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_api_keys_prefix').on(table.keyPrefix),
    index('idx_api_keys_user').on(table.userId),
  ]
);

// ============================================
// SCRAPING JOBS
// ============================================

export const scrapingJobs = pgTable(
  'scraping_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .references(() => sources.id)
      .notNull(),
    status: varchar('status', { length: 50 }).default('pending'), // pending, running, completed, failed
    listingsFound: integer('listings_found').default(0),
    listingsNew: integer('listings_new').default(0),
    listingsUpdated: integer('listings_updated').default(0),
    errors: jsonb('errors').$type<{ message: string; url?: string }[]>(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_scraping_jobs_source').on(table.sourceId),
    index('idx_scraping_jobs_status').on(table.status),
  ]
);

// ============================================
// RELATIONS
// ============================================

export const listingsRelations = relations(listings, ({ one, many }) => ({
  source: one(sources, {
    fields: [listings.sourceId],
    references: [sources.id],
  }),
  canonical: one(listings, {
    fields: [listings.canonicalId],
    references: [listings.id],
  }),
  images: many(listingImages),
  priceHistory: many(priceHistory),
  favorites: many(userFavorites),
  leads: many(leads),
  serviceLeads: many(serviceLeads),
  socialPosts: many(socialPosts),
  notifications: many(notifications),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, {
    fields: [listingImages.listingId],
    references: [listings.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  listing: one(listings, {
    fields: [priceHistory.listingId],
    references: [listings.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  favorites: many(userFavorites),
  alerts: many(searchAlerts),
  leads: many(leads),
  apiKeys: many(apiKeys),
  serviceProviders: many(serviceProviders),
  socialConnections: many(socialConnections),
  notifications: many(notifications),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [userFavorites.listingId],
    references: [listings.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  listings: many(listings),
  scrapingJobs: many(scrapingJobs),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;

export type ListingImage = typeof listingImages.$inferSelect;
export type NewListingImage = typeof listingImages.$inferInsert;

export type PriceHistoryRecord = typeof priceHistory.$inferSelect;
export type NewPriceHistoryRecord = typeof priceHistory.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type SearchAlert = typeof searchAlerts.$inferSelect;
export type NewSearchAlert = typeof searchAlerts.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type NewScrapingJob = typeof scrapingJobs.$inferInsert;

// ============================================
// SERVICE MARKETPLACE ENUMS
// ============================================

export const serviceCategoryEnum = pgEnum('service_category', [
  'painting',
  'renovation',
  'electrical',
  'plumbing',
  'garden',
  'general',
]);

export const providerStatusEnum = pgEnum('provider_status', [
  'pending',
  'active',
  'suspended',
  'inactive',
]);

export const providerTierEnum = pgEnum('provider_tier', [
  'free',
  'premium',
  'enterprise',
]);

export const serviceLeadStatusEnum = pgEnum('service_lead_status', [
  'new',
  'viewed',
  'contacted',
  'quoted',
  'accepted',
  'completed',
  'cancelled',
]);

// ============================================
// SERVICE PROVIDERS
// ============================================

export const serviceProviders = pgTable(
  'service_providers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Business info
    businessName: varchar('business_name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    logoUrl: varchar('logo_url', { length: 500 }),
    coverImageUrl: varchar('cover_image_url', { length: 500 }),

    // Contact
    contactName: varchar('contact_name', { length: 255 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 50 }).notNull(),
    website: varchar('website', { length: 500 }),

    // Location & coverage
    address: varchar('address', { length: 500 }),
    city: varchar('city', { length: 100 }).notNull(),
    province: varchar('province', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    country: varchar('country', { length: 100 }).default('España'),
    latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
    coverageRadiusKm: integer('coverage_radius_km').default(25).notNull(),

    // Status & subscription
    status: providerStatusEnum('status').default('pending').notNull(),
    tier: providerTierEnum('tier').default('free').notNull(),

    // Stripe
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripeCurrentPeriodEnd: timestamp('stripe_current_period_end', { withTimezone: true }),

    // Aggregated stats
    totalReviews: integer('total_reviews').default(0),
    averageRating: decimal('average_rating', { precision: 2, scale: 1 }).default('0'),
    totalLeads: integer('total_leads').default(0),
    leadsThisMonth: integer('leads_this_month').default(0),
    responseTimeMinutes: integer('response_time_minutes'),

    // Verification
    isVerified: boolean('is_verified').default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata').$type<{
      yearsInBusiness?: number;
      employeeCount?: number;
      certifications?: string[];
      insuranceInfo?: string;
      portfolioUrls?: string[];
      socialMedia?: {
        instagram?: string;
        facebook?: string;
        linkedin?: string;
      };
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_providers_user').on(table.userId),
    index('idx_providers_city').on(table.city),
    index('idx_providers_status').on(table.status),
    index('idx_providers_tier').on(table.tier),
    index('idx_providers_rating').on(table.averageRating),
    index('idx_providers_verified').on(table.isVerified),
    index('idx_providers_location').on(table.latitude, table.longitude),
  ]
);

// ============================================
// PROVIDER SERVICES (services offered by each provider)
// ============================================

export const providerServices = pgTable(
  'provider_services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => serviceProviders.id, { onDelete: 'cascade' })
      .notNull(),

    category: serviceCategoryEnum('category').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    // Pricing
    priceMin: decimal('price_min', { precision: 10, scale: 2 }),
    priceMax: decimal('price_max', { precision: 10, scale: 2 }),
    priceUnit: varchar('price_unit', { length: 50 }).default('proyecto'),

    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_provider_services_provider').on(table.providerId),
    index('idx_provider_services_category').on(table.category),
    uniqueIndex('idx_provider_services_unique').on(table.providerId, table.category),
  ]
);

// ============================================
// SERVICE LEADS (quote requests)
// ============================================

export const serviceLeads = pgTable(
  'service_leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => serviceProviders.id, { onDelete: 'cascade' })
      .notNull(),
    listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    improvementId: varchar('improvement_id', { length: 100 }),
    category: serviceCategoryEnum('category').notNull(),

    // Client info
    clientName: varchar('client_name', { length: 255 }).notNull(),
    clientEmail: varchar('client_email', { length: 255 }).notNull(),
    clientPhone: varchar('client_phone', { length: 50 }),

    // Work location
    workAddress: varchar('work_address', { length: 500 }),
    workCity: varchar('work_city', { length: 100 }),
    workLatitude: decimal('work_latitude', { precision: 10, scale: 7 }),
    workLongitude: decimal('work_longitude', { precision: 10, scale: 7 }),

    // Request details
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    budget: decimal('budget', { precision: 10, scale: 2 }),
    urgency: varchar('urgency', { length: 20 }).default('normal'),
    preferredDate: timestamp('preferred_date', { withTimezone: true }),

    // Status tracking
    status: serviceLeadStatusEnum('status').default('new').notNull(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    contactedAt: timestamp('contacted_at', { withTimezone: true }),
    quotedAmount: decimal('quoted_amount', { precision: 10, scale: 2 }),
    quotedAt: timestamp('quoted_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Attribution
    source: varchar('source', { length: 100 }).default('marketplace'),
    utmSource: varchar('utm_source', { length: 100 }),
    utmMedium: varchar('utm_medium', { length: 100 }),
    utmCampaign: varchar('utm_campaign', { length: 100 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_service_leads_provider').on(table.providerId),
    index('idx_service_leads_listing').on(table.listingId),
    index('idx_service_leads_category').on(table.category),
    index('idx_service_leads_status').on(table.status),
    index('idx_service_leads_created').on(table.createdAt),
  ]
);

// ============================================
// PROVIDER REVIEWS
// ============================================

export const providerReviews = pgTable(
  'provider_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => serviceProviders.id, { onDelete: 'cascade' })
      .notNull(),
    serviceLeadId: uuid('service_lead_id')
      .references(() => serviceLeads.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Author info
    authorName: varchar('author_name', { length: 255 }),
    authorEmail: varchar('author_email', { length: 255 }),

    // Ratings
    rating: integer('rating').notNull(),
    title: varchar('title', { length: 255 }),
    content: text('content'),

    // Detailed ratings
    qualityRating: integer('quality_rating'),
    communicationRating: integer('communication_rating'),
    timelinessRating: integer('timeliness_rating'),
    valueRating: integer('value_rating'),

    category: serviceCategoryEnum('category'),
    isVerified: boolean('is_verified').default(false),
    isPublished: boolean('is_published').default(true),

    // Provider response
    providerResponse: text('provider_response'),
    providerRespondedAt: timestamp('provider_responded_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_reviews_provider').on(table.providerId),
    index('idx_reviews_rating').on(table.rating),
    index('idx_reviews_lead').on(table.serviceLeadId),
    index('idx_reviews_verified').on(table.isVerified),
    uniqueIndex('idx_reviews_unique_lead').on(table.serviceLeadId),
  ]
);

// ============================================
// PROVIDER PORTFOLIO
// ============================================

export const providerPortfolio = pgTable(
  'provider_portfolio',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => serviceProviders.id, { onDelete: 'cascade' })
      .notNull(),

    category: serviceCategoryEnum('category').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    imageUrl: varchar('image_url', { length: 1000 }).notNull(),
    thumbnailUrl: varchar('thumbnail_url', { length: 1000 }),
    position: integer('position').default(0),

    projectDate: timestamp('project_date', { withTimezone: true }),
    projectDuration: varchar('project_duration', { length: 100 }),
    projectCost: decimal('project_cost', { precision: 10, scale: 2 }),

    isPublished: boolean('is_published').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_portfolio_provider').on(table.providerId),
    index('idx_portfolio_category').on(table.category),
    index('idx_portfolio_position').on(table.providerId, table.position),
  ]
);

// ============================================
// AREA CENTROIDS (fallback for proximity without exact coordinates)
// ============================================

export const areaCentroids = pgTable(
  'area_centroids',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    city: varchar('city', { length: 100 }).notNull(),
    neighborhood: varchar('neighborhood', { length: 100 }),
    province: varchar('province', { length: 100 }),
    country: varchar('country', { length: 100 }).default('España'),

    latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
    areaRadiusKm: decimal('area_radius_km', { precision: 5, scale: 2 }).default('5'),

    source: varchar('source', { length: 100 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_area_centroids_unique').on(table.city, table.neighborhood),
    index('idx_area_centroids_city').on(table.city),
  ]
);

// ============================================
// SERVICE MARKETPLACE RELATIONS
// ============================================

export const serviceProvidersRelations = relations(serviceProviders, ({ one, many }) => ({
  user: one(users, {
    fields: [serviceProviders.userId],
    references: [users.id],
  }),
  services: many(providerServices),
  leads: many(serviceLeads),
  reviews: many(providerReviews),
  portfolio: many(providerPortfolio),
}));

export const providerServicesRelations = relations(providerServices, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [providerServices.providerId],
    references: [serviceProviders.id],
  }),
}));

export const serviceLeadsRelations = relations(serviceLeads, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [serviceLeads.providerId],
    references: [serviceProviders.id],
  }),
  listing: one(listings, {
    fields: [serviceLeads.listingId],
    references: [listings.id],
  }),
}));

export const providerReviewsRelations = relations(providerReviews, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [providerReviews.providerId],
    references: [serviceProviders.id],
  }),
  serviceLead: one(serviceLeads, {
    fields: [providerReviews.serviceLeadId],
    references: [serviceLeads.id],
  }),
  user: one(users, {
    fields: [providerReviews.userId],
    references: [users.id],
  }),
}));

export const providerPortfolioRelations = relations(providerPortfolio, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [providerPortfolio.providerId],
    references: [serviceProviders.id],
  }),
}));

// ============================================
// SERVICE MARKETPLACE TYPE EXPORTS
// ============================================

export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type NewServiceProvider = typeof serviceProviders.$inferInsert;

export type ProviderService = typeof providerServices.$inferSelect;
export type NewProviderService = typeof providerServices.$inferInsert;

export type ServiceLead = typeof serviceLeads.$inferSelect;
export type NewServiceLead = typeof serviceLeads.$inferInsert;

export type ProviderReview = typeof providerReviews.$inferSelect;
export type NewProviderReview = typeof providerReviews.$inferInsert;

export type ProviderPortfolioItem = typeof providerPortfolio.$inferSelect;
export type NewProviderPortfolioItem = typeof providerPortfolio.$inferInsert;

export type AreaCentroid = typeof areaCentroids.$inferSelect;
export type NewAreaCentroid = typeof areaCentroids.$inferInsert;

export type ServiceCategory = (typeof serviceCategoryEnum.enumValues)[number];
export type ProviderStatus = (typeof providerStatusEnum.enumValues)[number];
export type ProviderTier = (typeof providerTierEnum.enumValues)[number];
export type ServiceLeadStatus = (typeof serviceLeadStatusEnum.enumValues)[number];

// ============================================
// NOTIFICATIONS - ENUMS
// ============================================

export const notificationTypeEnum = pgEnum('notification_type', [
  'social_published',
  'social_failed',
  'social_lead',
  'content_generated',
  'workflow_completed',
  'system',
]);

/**
 * Notifications - User notifications
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),

  // Link to related entities
  socialPostId: uuid('social_post_id').references(() => socialPosts.id, { onDelete: 'set null' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  workflowExecutionId: uuid('workflow_execution_id').references(() => workflowExecutions.id, { onDelete: 'set null' }),

  // Status
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at', { withTimezone: true }),

  // Additional data
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  typeIdx: index('idx_notifications_type').on(table.type),
  isReadIdx: index('idx_notifications_is_read').on(table.isRead),
  createdIdx: index('idx_notifications_created').on(table.createdAt),
}));

// ============================================
// NOTIFICATIONS - RELATIONS
// ============================================

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  socialPost: one(socialPosts, {
    fields: [notifications.socialPostId],
    references: [socialPosts.id],
  }),
  listing: one(listings, {
    fields: [notifications.listingId],
    references: [listings.id],
  }),
  workflowExecution: one(workflowExecutions, {
    fields: [notifications.workflowExecutionId],
    references: [workflowExecutions.id],
  }),
}));

// ============================================
// NOTIFICATIONS - TYPE EXPORTS
// ============================================

export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ============================================
// AI AGENT SYSTEM - ENUMS
// ============================================

/**
 * Specialized agent types - each with specific capabilities and pricing
 */
export const agentTypeEnum = pgEnum('agent_type', [
  'search',       // Property search agent - finds listings based on criteria
  'verify',       // Verification agent - validates listings, detects issues
  'negotiate',    // Negotiation agent - suggests offers, counter-offers
  'service_match', // Service matching - connects with providers
  'valuation',    // Valuation agent - estimates property values
  'alert',        // Alert agent - monitors for new listings/changes
  'publish',      // Publishing agent - auto-posts to portals
  'transaction',  // Transaction agent - manages full sale/rent process
  // NEW: AI Infrastructure agents
  'coordinator',  // Orchestrates other agents for complex tasks
  'social_media', // Publishes to social networks (FB, IG, LinkedIn, TikTok)
  'content',      // Generates marketing content using AI
]);

/**
 * Agent session status
 */
export const agentSessionStatusEnum = pgEnum('agent_session_status', [
  'active',       // Session in progress
  'completed',    // Successfully completed
  'abandoned',    // User left without completing
  'error',        // Technical error
  'timeout',      // Session timed out
]);

/**
 * Transaction status for outcome-based billing
 */
export const agentTransactionStatusEnum = pgEnum('agent_transaction_status', [
  'pending',      // Transaction initiated
  'processing',   // Being processed
  'completed',    // Successfully completed - billable
  'failed',       // Failed - not billable
  'refunded',     // Refunded to customer
  'disputed',     // Under dispute
]);

/**
 * Transaction types with associated pricing
 */
export const agentTransactionTypeEnum = pgEnum('agent_transaction_type', [
  'search_result',     // Delivered search results
  'verification',      // Property verification completed
  'valuation',         // Valuation delivered
  'service_booking',   // Service provider booked (10% fee)
  'lead_generated',    // Lead sent to agent/provider
  'property_sold',     // Property transaction completed (0.3-0.5%)
  'property_rented',   // Rental transaction completed
  'portal_published',  // Published to external portal
  'api_call',          // B2B API consumption
  // NEW: AI Infrastructure transaction types
  'social_post',       // Post published to social network (0.50€)
  'content_generated', // AI content generated (0.25€)
  'agent_delegation',  // Task delegated to another agent
  'workflow_executed', // Automated workflow completed
]);

// ============================================
// SOCIAL MEDIA & CONTENT - ENUMS
// ============================================

/**
 * Social media platforms supported for autoposting
 */
export const socialPlatformEnum = pgEnum('social_platform', [
  'facebook',
  'instagram',
  'linkedin',
  'tiktok',
  'twitter',
]);

/**
 * Social connection status
 */
export const socialConnectionStatusEnum = pgEnum('social_connection_status', [
  'active',        // Connection working
  'expired',       // Token expired, needs refresh
  'revoked',       // User revoked access
  'error',         // Connection error
]);

/**
 * Social post status
 */
export const socialPostStatusEnum = pgEnum('social_post_status', [
  'draft',         // Not yet published
  'scheduled',     // Scheduled for future
  'publishing',    // Currently being published
  'published',     // Successfully published
  'failed',        // Publication failed
  'deleted',       // Deleted from platform
]);

/**
 * Content type for AI generation
 */
export const contentTypeEnum = pgEnum('content_type', [
  'description',       // Long listing description
  'short_description', // Short social description
  'hashtags',          // Optimized hashtags
  'social_post',       // Complete social post
  'ad_copy',           // Advertisement copy
  'email_subject',     // Email subject line
  'email_body',        // Email body
  'video_script',      // Script for video/reel
  'seo_title',         // SEO optimized title
  'seo_description',   // Meta description
]);

/**
 * Workflow trigger types
 */
export const workflowTriggerEnum = pgEnum('workflow_trigger', [
  'listing_created',   // New listing published
  'price_changed',     // Price was updated
  'lead_received',     // New lead came in
  'scheduled',         // Time-based trigger
  'manual',            // Manual execution
  'social_posted',     // After social post
  'verification_done', // After cadastral verification
]);

/**
 * Workflow status
 */
export const workflowStatusEnum = pgEnum('workflow_status', [
  'active',
  'paused',
  'completed',
  'failed',
]);

// ============================================
// SOCIAL MEDIA & CONTENT - TABLES
// ============================================

/**
 * Social Connections - OAuth connections to social platforms
 */
export const socialConnections = pgTable('social_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Platform info
  platform: socialPlatformEnum('platform').notNull(),
  platformUserId: varchar('platform_user_id', { length: 100 }),
  platformUsername: varchar('platform_username', { length: 255 }),

  // OAuth tokens (encrypted in production)
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),

  // For Facebook/Instagram business pages
  pageId: varchar('page_id', { length: 100 }),
  pageName: varchar('page_name', { length: 255 }),
  pageAccessToken: text('page_access_token'),

  // Status
  status: socialConnectionStatusEnum('status').default('active').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  errorMessage: text('error_message'),

  // Metadata
  scopes: jsonb('scopes').$type<string[]>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('social_connections_user_idx').on(table.userId),
  index('social_connections_platform_idx').on(table.platform),
  uniqueIndex('social_connections_user_platform_page_idx').on(table.userId, table.platform, table.pageId),
]);

/**
 * Social Posts - Posts published to social platforms
 */
export const socialPosts = pgTable('social_posts', {
  id: uuid('id').defaultRandom().primaryKey(),

  // References
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  connectionId: uuid('connection_id').references(() => socialConnections.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Platform info
  platform: socialPlatformEnum('platform').notNull(),
  platformPostId: varchar('platform_post_id', { length: 255 }),
  postUrl: varchar('post_url', { length: 1000 }),

  // Content
  content: text('content'),
  hashtags: jsonb('hashtags').$type<string[]>(),
  mediaUrls: jsonb('media_urls').$type<string[]>(),
  mediaType: varchar('media_type', { length: 20 }), // image, video, carousel

  // Status & scheduling
  status: socialPostStatusEnum('status').default('draft').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),

  // Analytics (updated periodically)
  analytics: jsonb('analytics').$type<{
    impressions?: number;
    reach?: number;
    engagement?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    clicks?: number;
    saves?: number;
  }>(),
  analyticsUpdatedAt: timestamp('analytics_updated_at', { withTimezone: true }),

  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('social_posts_listing_idx').on(table.listingId),
  index('social_posts_user_idx').on(table.userId),
  index('social_posts_status_idx').on(table.status),
  index('social_posts_scheduled_idx').on(table.scheduledAt),
]);

/**
 * AI Generated Content - Stores generated content for reuse
 */
export const aiGeneratedContent = pgTable('ai_generated_content', {
  id: uuid('id').defaultRandom().primaryKey(),

  // References
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Content details
  contentType: contentTypeEnum('content_type').notNull(),
  platform: socialPlatformEnum('platform'),
  language: varchar('language', { length: 5 }).default('es'),
  tone: varchar('tone', { length: 20 }), // professional, casual, luxury, friendly

  // Generated content
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    generationTimeMs?: number;
  }>(),

  // Usage tracking
  usedCount: integer('used_count').default(0),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

  // Rating/feedback
  rating: integer('rating'), // 1-5 stars
  feedback: text('feedback'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ai_content_listing_idx').on(table.listingId),
  index('ai_content_user_type_idx').on(table.userId, table.contentType),
]);

/**
 * AI Workflows - Automated agent workflows
 */
export const aiWorkflows = pgTable('ai_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Workflow definition
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Trigger configuration
  trigger: workflowTriggerEnum('trigger').notNull(),
  triggerConditions: jsonb('trigger_conditions').$type<{
    listingType?: string;
    priceRange?: { min?: number; max?: number };
    cities?: string[];
    schedule?: string; // cron expression
  }>(),

  // Actions to execute
  actions: jsonb('actions').$type<{
    agent: string;
    params: Record<string, unknown>;
    onSuccess?: string; // next action or 'complete'
    onFailure?: string; // retry, skip, abort
  }[]>().notNull(),

  // Status
  status: workflowStatusEnum('status').default('active').notNull(),
  isEnabled: boolean('is_enabled').default(true),

  // Execution stats
  executionCount: integer('execution_count').default(0),
  lastExecutedAt: timestamp('last_executed_at', { withTimezone: true }),
  lastExecutionStatus: varchar('last_execution_status', { length: 20 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ai_workflows_user_idx').on(table.userId),
  index('ai_workflows_trigger_idx').on(table.trigger),
]);

/**
 * Workflow Executions - Log of workflow runs
 */
export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').references(() => aiWorkflows.id, { onDelete: 'cascade' }).notNull(),

  // Trigger info
  triggeredBy: varchar('triggered_by', { length: 50 }).notNull(), // event type or 'manual'
  triggerData: jsonb('trigger_data').$type<Record<string, unknown>>(),

  // Execution details
  status: varchar('status', { length: 20 }).default('running').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Results
  actionsExecuted: jsonb('actions_executed').$type<{
    agent: string;
    status: 'success' | 'failed' | 'skipped';
    result?: unknown;
    error?: string;
    durationMs?: number;
  }[]>(),

  // Billing
  totalCost: decimal('total_cost', { precision: 10, scale: 4 }),

  errorMessage: text('error_message'),
}, (table) => [
  index('workflow_executions_workflow_idx').on(table.workflowId),
  index('workflow_executions_status_idx').on(table.status),
]);

// ============================================
// AI AGENT SYSTEM - TABLES
// ============================================

/**
 * Agent Sessions - Tracks conversations with AI agents
 * Each session represents an interaction with a specialized agent
 */
export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // User context (null for B2B API calls)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  apiKeyId: uuid('api_key_id').references(() => agentApiKeys.id, { onDelete: 'set null' }),

  // Agent configuration
  agentType: agentTypeEnum('agent_type').notNull(),
  sessionToken: varchar('session_token', { length: 64 }).notNull().unique(),

  // Status
  status: agentSessionStatusEnum('status').default('active').notNull(),

  // Context & conversation
  initialContext: jsonb('initial_context').$type<{
    listingId?: string;
    searchCriteria?: Record<string, unknown>;
    providerId?: string;
    intent?: string;
    referrer?: string;
    locale?: string;
  }>(),
  conversationHistory: jsonb('conversation_history').$type<{
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: string;
    toolCalls?: { name: string; args: Record<string, unknown>; result?: unknown }[];
  }[]>(),

  // Outcomes & billing
  outcomesGenerated: integer('outcomes_generated').default(0),
  totalTokensUsed: integer('total_tokens_used').default(0),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 4 }).default('0'),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<{
    userAgent?: string;
    ipAddress?: string;
    geoLocation?: { city?: string; country?: string };
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    source?: 'web' | 'api' | 'widget' | 'mobile_app';
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_agent_sessions_user').on(table.userId),
  apiKeyIdx: index('idx_agent_sessions_api_key').on(table.apiKeyId),
  typeIdx: index('idx_agent_sessions_type').on(table.agentType),
  statusIdx: index('idx_agent_sessions_status').on(table.status),
  tokenIdx: uniqueIndex('idx_agent_sessions_token').on(table.sessionToken),
  startedIdx: index('idx_agent_sessions_started').on(table.startedAt),
}));

/**
 * Agent Transactions - Outcome ledger for billing
 * Each row represents a billable outcome from an agent session
 */
export const agentTransactions = pgTable('agent_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // References
  sessionId: uuid('session_id').references(() => agentSessions.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  apiKeyId: uuid('api_key_id').references(() => agentApiKeys.id, { onDelete: 'set null' }),

  // Transaction details
  transactionType: agentTransactionTypeEnum('transaction_type').notNull(),
  status: agentTransactionStatusEnum('status').default('pending').notNull(),

  // Pricing (outcome-based)
  baseAmount: decimal('base_amount', { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('EUR'),

  // For percentage-based fees (property transactions)
  referenceAmount: decimal('reference_amount', { precision: 12, scale: 2 }),
  feePercentage: decimal('fee_percentage', { precision: 5, scale: 4 }),

  // Related entities
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  serviceProviderId: uuid('service_provider_id').references(() => serviceProviders.id, { onDelete: 'set null' }),
  serviceLeadId: uuid('service_lead_id').references(() => serviceLeads.id, { onDelete: 'set null' }),

  // Stripe integration
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),

  // Outcome description
  description: text('description'),
  outcomeData: jsonb('outcome_data').$type<{
    resultCount?: number;
    matchScore?: number;
    verificationResults?: Record<string, unknown>;
    valuationData?: { estimate: number; confidence: number };
    portalIds?: string[];
    escrowId?: string;
    type?: string;
  }>(),

  // Billing
  invoiceId: varchar('invoice_id', { length: 100 }),
  billedAt: timestamp('billed_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('idx_agent_transactions_session').on(table.sessionId),
  userIdx: index('idx_agent_transactions_user').on(table.userId),
  apiKeyIdx: index('idx_agent_transactions_api_key').on(table.apiKeyId),
  typeIdx: index('idx_agent_transactions_type').on(table.transactionType),
  statusIdx: index('idx_agent_transactions_status').on(table.status),
  listingIdx: index('idx_agent_transactions_listing').on(table.listingId),
  createdIdx: index('idx_agent_transactions_created').on(table.createdAt),
  stripeIdx: index('idx_agent_transactions_stripe').on(table.stripePaymentIntentId),
}));

/**
 * Agent API Keys - B2B authentication for external AI agents
 * More specialized than generic apiKeys for agent-specific scopes
 */
export const agentApiKeys = pgTable('agent_api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Key identification
  name: varchar('name', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 16 }).notNull(), // inmo_agent_xxx
  keyHash: varchar('key_hash', { length: 255 }).notNull(),

  // Agent-specific scopes
  allowedAgents: jsonb('allowed_agents').$type<(typeof agentTypeEnum.enumValues)[number][]>().default([]),
  scopes: jsonb('scopes').$type<string[]>().default([]), // 'read:listings', 'write:bookings', etc.

  // Rate limiting
  rateLimit: integer('rate_limit').default(1000), // requests per hour
  dailyLimit: integer('daily_limit').default(10000), // requests per day
  monthlyCredits: integer('monthly_credits').default(100000), // outcome credits
  usedCreditsThisMonth: integer('used_credits_this_month').default(0),

  // Pricing tier
  tier: varchar('tier', { length: 50 }).default('developer'), // developer, business, enterprise
  customPricing: jsonb('custom_pricing').$type<{
    searchResultPrice?: number;
    verificationPrice?: number;
    valuationPrice?: number;
    transactionFeePercent?: number;
  }>(),

  // Webhook configuration
  webhookUrl: varchar('webhook_url', { length: 1000 }),
  webhookSecret: varchar('webhook_secret', { length: 255 }),
  webhookEvents: jsonb('webhook_events').$type<string[]>().default([]),

  // Status
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<{
    companyName?: string;
    contactEmail?: string;
    useCase?: string;
    ipAllowlist?: string[];
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_agent_api_keys_user').on(table.userId),
  prefixIdx: uniqueIndex('idx_agent_api_keys_prefix').on(table.keyPrefix),
  activeIdx: index('idx_agent_api_keys_active').on(table.isActive),
  tierIdx: index('idx_agent_api_keys_tier').on(table.tier),
}));

/**
 * Agent Usage - Detailed usage tracking for billing and analytics
 */
export const agentUsage = pgTable('agent_usage', {
  id: uuid('id').defaultRandom().primaryKey(),

  // References
  sessionId: uuid('session_id').references(() => agentSessions.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => agentApiKeys.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

  // Usage details
  agentType: agentTypeEnum('agent_type').notNull(),
  operationType: varchar('operation_type', { length: 100 }).notNull(), // search, verify, etc.

  // Token usage
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),

  // Compute metrics
  durationMs: integer('duration_ms'),
  modelUsed: varchar('model_used', { length: 100 }),

  // Cost calculation
  tokenCost: decimal('token_cost', { precision: 10, scale: 6 }).default('0'),
  computeCost: decimal('compute_cost', { precision: 10, scale: 6 }).default('0'),
  totalCost: decimal('total_cost', { precision: 10, scale: 6 }).default('0'),

  // Request details
  requestPayload: jsonb('request_payload').$type<Record<string, unknown>>(),
  responsePayload: jsonb('response_payload').$type<Record<string, unknown>>(),

  // Error tracking
  isError: boolean('is_error').default(false),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('idx_agent_usage_session').on(table.sessionId),
  apiKeyIdx: index('idx_agent_usage_api_key').on(table.apiKeyId),
  userIdx: index('idx_agent_usage_user').on(table.userId),
  typeIdx: index('idx_agent_usage_type').on(table.agentType),
  createdIdx: index('idx_agent_usage_created').on(table.createdAt),
  errorIdx: index('idx_agent_usage_error').on(table.isError),
}));

/**
 * Escrow - Trust layer for property transactions
 * Holds funds until conditions are met
 */
export const escrow = pgTable('escrow', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Transaction parties
  buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'set null' }),
  sellerId: uuid('seller_id').references(() => users.id, { onDelete: 'set null' }),
  agentSessionId: uuid('agent_session_id').references(() => agentSessions.id, { onDelete: 'set null' }),

  // Related entities
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),

  // Funds
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('EUR'),
  platformFee: decimal('platform_fee', { precision: 12, scale: 2 }).default('0'),

  // Stripe
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),

  // Status
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, funded, released, refunded, disputed

  // Conditions
  conditions: jsonb('conditions').$type<{
    type: 'property_sale' | 'property_rent' | 'service_completion' | 'custom';
    description: string;
    deadline?: string;
    verificationRequired?: boolean;
  }[]>(),
  conditionsMet: boolean('conditions_met').default(false),

  // Timeline
  fundedAt: timestamp('funded_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  disputedAt: timestamp('disputed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),

  // Notes & evidence
  notes: text('notes'),
  evidence: jsonb('evidence').$type<{
    documentUrls?: string[];
    verificationIds?: string[];
    signatures?: { partyId: string; signedAt: string; signatureUrl: string }[];
  }>(),

  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  buyerIdx: index('idx_escrow_buyer').on(table.buyerId),
  sellerIdx: index('idx_escrow_seller').on(table.sellerId),
  listingIdx: index('idx_escrow_listing').on(table.listingId),
  statusIdx: index('idx_escrow_status').on(table.status),
  stripeIdx: index('idx_escrow_stripe').on(table.stripePaymentIntentId),
}));

// ============================================
// AI AGENT SYSTEM - RELATIONS
// ============================================

export const agentSessionsRelations = relations(agentSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [agentSessions.userId],
    references: [users.id],
  }),
  apiKey: one(agentApiKeys, {
    fields: [agentSessions.apiKeyId],
    references: [agentApiKeys.id],
  }),
  transactions: many(agentTransactions),
  usage: many(agentUsage),
  escrows: many(escrow),
}));

export const agentTransactionsRelations = relations(agentTransactions, ({ one }) => ({
  session: one(agentSessions, {
    fields: [agentTransactions.sessionId],
    references: [agentSessions.id],
  }),
  user: one(users, {
    fields: [agentTransactions.userId],
    references: [users.id],
  }),
  apiKey: one(agentApiKeys, {
    fields: [agentTransactions.apiKeyId],
    references: [agentApiKeys.id],
  }),
  listing: one(listings, {
    fields: [agentTransactions.listingId],
    references: [listings.id],
  }),
  serviceProvider: one(serviceProviders, {
    fields: [agentTransactions.serviceProviderId],
    references: [serviceProviders.id],
  }),
  serviceLead: one(serviceLeads, {
    fields: [agentTransactions.serviceLeadId],
    references: [serviceLeads.id],
  }),
}));

export const agentApiKeysRelations = relations(agentApiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [agentApiKeys.userId],
    references: [users.id],
  }),
  sessions: many(agentSessions),
  transactions: many(agentTransactions),
  usage: many(agentUsage),
}));

export const agentUsageRelations = relations(agentUsage, ({ one }) => ({
  session: one(agentSessions, {
    fields: [agentUsage.sessionId],
    references: [agentSessions.id],
  }),
  apiKey: one(agentApiKeys, {
    fields: [agentUsage.apiKeyId],
    references: [agentApiKeys.id],
  }),
  user: one(users, {
    fields: [agentUsage.userId],
    references: [users.id],
  }),
}));

export const escrowRelations = relations(escrow, ({ one }) => ({
  buyer: one(users, {
    fields: [escrow.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [escrow.sellerId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [escrow.listingId],
    references: [listings.id],
  }),
  agentSession: one(agentSessions, {
    fields: [escrow.agentSessionId],
    references: [agentSessions.id],
  }),
}));

// ============================================
// AI AGENT SYSTEM - TYPE EXPORTS
// ============================================

export type AgentType = (typeof agentTypeEnum.enumValues)[number];
export type AgentSessionStatus = (typeof agentSessionStatusEnum.enumValues)[number];
export type AgentTransactionStatus = (typeof agentTransactionStatusEnum.enumValues)[number];
export type AgentTransactionType = (typeof agentTransactionTypeEnum.enumValues)[number];

export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;

export type AgentTransaction = typeof agentTransactions.$inferSelect;
export type NewAgentTransaction = typeof agentTransactions.$inferInsert;

export type AgentApiKey = typeof agentApiKeys.$inferSelect;
export type NewAgentApiKey = typeof agentApiKeys.$inferInsert;

export type AgentUsage = typeof agentUsage.$inferSelect;
export type NewAgentUsage = typeof agentUsage.$inferInsert;

export type Escrow = typeof escrow.$inferSelect;
export type NewEscrow = typeof escrow.$inferInsert;

// ============================================
// SOCIAL MEDIA & CONTENT - RELATIONS
// ============================================

export const socialConnectionsRelations = relations(socialConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [socialConnections.userId],
    references: [users.id],
  }),
  posts: many(socialPosts),
}));

export const socialPostsRelations = relations(socialPosts, ({ one }) => ({
  listing: one(listings, {
    fields: [socialPosts.listingId],
    references: [listings.id],
  }),
  connection: one(socialConnections, {
    fields: [socialPosts.connectionId],
    references: [socialConnections.id],
  }),
  user: one(users, {
    fields: [socialPosts.userId],
    references: [users.id],
  }),
}));

export const aiGeneratedContentRelations = relations(aiGeneratedContent, ({ one }) => ({
  listing: one(listings, {
    fields: [aiGeneratedContent.listingId],
    references: [listings.id],
  }),
  user: one(users, {
    fields: [aiGeneratedContent.userId],
    references: [users.id],
  }),
}));

export const aiWorkflowsRelations = relations(aiWorkflows, ({ one, many }) => ({
  user: one(users, {
    fields: [aiWorkflows.userId],
    references: [users.id],
  }),
  executions: many(workflowExecutions),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one }) => ({
  workflow: one(aiWorkflows, {
    fields: [workflowExecutions.workflowId],
    references: [aiWorkflows.id],
  }),
}));

// ============================================
// SOCIAL MEDIA & CONTENT - TYPE EXPORTS
// ============================================

export type SocialPlatform = (typeof socialPlatformEnum.enumValues)[number];
export type SocialConnectionStatus = (typeof socialConnectionStatusEnum.enumValues)[number];
export type SocialPostStatus = (typeof socialPostStatusEnum.enumValues)[number];
export type ContentType = (typeof contentTypeEnum.enumValues)[number];
export type WorkflowTrigger = (typeof workflowTriggerEnum.enumValues)[number];
export type WorkflowStatus = (typeof workflowStatusEnum.enumValues)[number];

export type SocialConnection = typeof socialConnections.$inferSelect;
export type NewSocialConnection = typeof socialConnections.$inferInsert;

export type SocialPost = typeof socialPosts.$inferSelect;
export type NewSocialPost = typeof socialPosts.$inferInsert;

export type AIGeneratedContent = typeof aiGeneratedContent.$inferSelect;
export type NewAIGeneratedContent = typeof aiGeneratedContent.$inferInsert;

export type AIWorkflow = typeof aiWorkflows.$inferSelect;
export type NewAIWorkflow = typeof aiWorkflows.$inferInsert;

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
