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
  portalPosts: many(portalPosts),
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
  portalConnections: many(portalConnections),
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
// AUTOPOSTING SYSTEM - ENUMS
// ============================================

export const portalEnum = pgEnum('portal', [
  'idealista',
  'fotocasa',
  'habitaclia',
  'pisos',
  'milanuncios',
]);

export const portalConnectionStatusEnum = pgEnum('portal_connection_status', [
  'active',
  'expired',
  'revoked',
  'error',
]);

export const portalPostStatusEnum = pgEnum('portal_post_status', [
  'draft',
  'pending',
  'publishing',
  'published',
  'failed',
  'updating',
  'deleting',
  'deleted',
  'paused',
  'rejected',
]);

export const portalSyncJobTypeEnum = pgEnum('portal_sync_job_type', [
  'publish',
  'update',
  'delete',
  'sync_leads',
  'sync_analytics',
  'refresh_token',
]);

export const portalSyncJobStatusEnum = pgEnum('portal_sync_job_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'portal_published',
  'portal_failed',
  'portal_lead',
  'portal_expired',
  'portal_stats',
  'system',
]);

// ============================================
// AUTOPOSTING SYSTEM - TABLES
// ============================================

/**
 * Portal Connections - OAuth connections to real estate portals
 * Stores encrypted tokens and connection status
 */
export const portalConnections = pgTable('portal_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  portal: portalEnum('portal').notNull(),

  // OAuth tokens (encrypted at application level)
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),

  // Portal-specific account info
  portalAccountId: varchar('portal_account_id', { length: 255 }),
  portalAccountEmail: varchar('portal_account_email', { length: 255 }),
  portalAccountName: varchar('portal_account_name', { length: 255 }),

  // Connection settings
  status: portalConnectionStatusEnum('status').default('active').notNull(),
  autoSync: boolean('auto_sync').default(true),
  syncInterval: integer('sync_interval_hours').default(6),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastErrorMessage: text('last_error_message'),
  lastErrorAt: timestamp('last_error_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<{
    scopes?: string[];
    capabilities?: string[];
    quotas?: {
      dailyPosts?: number;
      monthlyPosts?: number;
      usedToday?: number;
      usedThisMonth?: number;
    };
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_portal_connections_user').on(table.userId),
  portalIdx: index('idx_portal_connections_portal').on(table.portal),
  statusIdx: index('idx_portal_connections_status').on(table.status),
  uniqueUserPortal: uniqueIndex('idx_portal_connections_unique').on(table.userId, table.portal),
}));

/**
 * Portal Posts - Published listings on external portals
 * Tracks the state of each listing on each portal
 */
export const portalPosts = pgTable('portal_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectionId: uuid('connection_id').notNull().references(() => portalConnections.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  portal: portalEnum('portal').notNull(),

  // Portal identifiers
  portalListingId: varchar('portal_listing_id', { length: 255 }),
  portalUrl: varchar('portal_url', { length: 1000 }),

  // Status tracking
  status: portalPostStatusEnum('status').default('draft').notNull(),
  lastStatusChange: timestamp('last_status_change', { withTimezone: true }).defaultNow(),
  errorMessage: text('error_message'),
  errorCode: varchar('error_code', { length: 50 }),
  retryCount: integer('retry_count').default(0),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),

  // Content sync tracking
  lastSyncedPrice: decimal('last_synced_price', { precision: 12, scale: 2 }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  contentHash: varchar('content_hash', { length: 64 }), // For detecting changes

  // Publication dates
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  unpublishedAt: timestamp('unpublished_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<{
    publishOptions?: {
      featured?: boolean;
      highlighted?: boolean;
      urgent?: boolean;
    };
    portalResponse?: Record<string, unknown>;
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  connectionIdx: index('idx_portal_posts_connection').on(table.connectionId),
  listingIdx: index('idx_portal_posts_listing').on(table.listingId),
  portalIdx: index('idx_portal_posts_portal').on(table.portal),
  statusIdx: index('idx_portal_posts_status').on(table.status),
  uniqueListingPortal: uniqueIndex('idx_portal_posts_unique').on(table.listingId, table.portal),
}));

/**
 * Portal Sync Jobs - BullMQ job tracking
 * Stores job state for async operations
 */
export const portalSyncJobs = pgTable('portal_sync_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectionId: uuid('connection_id').references(() => portalConnections.id, { onDelete: 'set null' }),
  postId: uuid('post_id').references(() => portalPosts.id, { onDelete: 'set null' }),

  jobType: portalSyncJobTypeEnum('job_type').notNull(),
  status: portalSyncJobStatusEnum('status').default('pending').notNull(),
  priority: integer('priority').default(0),

  // BullMQ integration
  bullmqJobId: varchar('bullmq_job_id', { length: 255 }),
  queueName: varchar('queue_name', { length: 100 }),

  // Job data
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  result: jsonb('result').$type<Record<string, unknown>>(),
  errorMessage: text('error_message'),

  // Timing
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Retry tracking
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  connectionIdx: index('idx_portal_sync_jobs_connection').on(table.connectionId),
  postIdx: index('idx_portal_sync_jobs_post').on(table.postId),
  statusIdx: index('idx_portal_sync_jobs_status').on(table.status),
  typeIdx: index('idx_portal_sync_jobs_type').on(table.jobType),
  scheduledIdx: index('idx_portal_sync_jobs_scheduled').on(table.scheduledFor),
}));

/**
 * Portal Analytics - Daily metrics per portal post
 */
export const portalAnalytics = pgTable('portal_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => portalPosts.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }).notNull(),

  // Engagement metrics
  views: integer('views').default(0),
  uniqueViews: integer('unique_views').default(0),
  clicks: integer('clicks').default(0),
  phoneClicks: integer('phone_clicks').default(0),
  emailClicks: integer('email_clicks').default(0),
  favorites: integer('favorites').default(0),
  shares: integer('shares').default(0),

  // Lead metrics
  leadsGenerated: integer('leads_generated').default(0),

  // Position tracking (if available)
  searchPosition: integer('search_position'),
  categoryPosition: integer('category_position'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  postIdx: index('idx_portal_analytics_post').on(table.postId),
  dateIdx: index('idx_portal_analytics_date').on(table.date),
  uniquePostDate: uniqueIndex('idx_portal_analytics_unique').on(table.postId, table.date),
}));

/**
 * Portal Leads - Leads received from portals
 */
export const portalLeads = pgTable('portal_leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => portalPosts.id, { onDelete: 'cascade' }),
  portal: portalEnum('portal').notNull(),

  // Portal lead identifier
  portalLeadId: varchar('portal_lead_id', { length: 255 }),

  // Contact info
  contactName: varchar('contact_name', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),

  // Lead content
  subject: varchar('subject', { length: 500 }),
  message: text('message'),

  // Status
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  isReplied: boolean('is_replied').default(false),
  repliedAt: timestamp('replied_at', { withTimezone: true }),

  // Raw data from portal (for debugging/audit)
  rawData: jsonb('raw_data').$type<Record<string, unknown>>(),

  // Timestamps from portal
  portalReceivedAt: timestamp('portal_received_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  postIdx: index('idx_portal_leads_post').on(table.postId),
  portalIdx: index('idx_portal_leads_portal').on(table.portal),
  isReadIdx: index('idx_portal_leads_is_read').on(table.isRead),
  uniquePortalLead: uniqueIndex('idx_portal_leads_unique').on(table.portal, table.portalLeadId),
}));

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
  portalPostId: uuid('portal_post_id').references(() => portalPosts.id, { onDelete: 'set null' }),
  portalLeadId: uuid('portal_lead_id').references(() => portalLeads.id, { onDelete: 'set null' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),

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
// AUTOPOSTING SYSTEM - RELATIONS
// ============================================

export const portalConnectionsRelations = relations(portalConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [portalConnections.userId],
    references: [users.id],
  }),
  posts: many(portalPosts),
  syncJobs: many(portalSyncJobs),
}));

export const portalPostsRelations = relations(portalPosts, ({ one, many }) => ({
  connection: one(portalConnections, {
    fields: [portalPosts.connectionId],
    references: [portalConnections.id],
  }),
  listing: one(listings, {
    fields: [portalPosts.listingId],
    references: [listings.id],
  }),
  analytics: many(portalAnalytics),
  leads: many(portalLeads),
  syncJobs: many(portalSyncJobs),
  notifications: many(notifications),
}));

export const portalSyncJobsRelations = relations(portalSyncJobs, ({ one }) => ({
  connection: one(portalConnections, {
    fields: [portalSyncJobs.connectionId],
    references: [portalConnections.id],
  }),
  post: one(portalPosts, {
    fields: [portalSyncJobs.postId],
    references: [portalPosts.id],
  }),
}));

export const portalAnalyticsRelations = relations(portalAnalytics, ({ one }) => ({
  post: one(portalPosts, {
    fields: [portalAnalytics.postId],
    references: [portalPosts.id],
  }),
}));

export const portalLeadsRelations = relations(portalLeads, ({ one, many }) => ({
  post: one(portalPosts, {
    fields: [portalLeads.postId],
    references: [portalPosts.id],
  }),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  portalPost: one(portalPosts, {
    fields: [notifications.portalPostId],
    references: [portalPosts.id],
  }),
  portalLead: one(portalLeads, {
    fields: [notifications.portalLeadId],
    references: [portalLeads.id],
  }),
  listing: one(listings, {
    fields: [notifications.listingId],
    references: [listings.id],
  }),
}));

// ============================================
// AUTOPOSTING SYSTEM - TYPE EXPORTS
// ============================================

export type Portal = (typeof portalEnum.enumValues)[number];
export type PortalConnectionStatus = (typeof portalConnectionStatusEnum.enumValues)[number];
export type PortalPostStatus = (typeof portalPostStatusEnum.enumValues)[number];
export type PortalSyncJobType = (typeof portalSyncJobTypeEnum.enumValues)[number];
export type PortalSyncJobStatus = (typeof portalSyncJobStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export type PortalConnection = typeof portalConnections.$inferSelect;
export type NewPortalConnection = typeof portalConnections.$inferInsert;

export type PortalPost = typeof portalPosts.$inferSelect;
export type NewPortalPost = typeof portalPosts.$inferInsert;

export type PortalSyncJob = typeof portalSyncJobs.$inferSelect;
export type NewPortalSyncJob = typeof portalSyncJobs.$inferInsert;

export type PortalAnalytics = typeof portalAnalytics.$inferSelect;
export type NewPortalAnalytics = typeof portalAnalytics.$inferInsert;

export type PortalLead = typeof portalLeads.$inferSelect;
export type NewPortalLead = typeof portalLeads.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
