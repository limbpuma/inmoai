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
