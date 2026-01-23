/**
 * AI Service Types (Backend)
 */

// AI Operation Modes
export type AIMode = "lazy" | "active" | "autonomous";

// AI Status
export type AIStatus = "idle" | "working" | "waiting" | "error" | "paused";

// Delegable AI Functions
export type AIFunction =
  | "scraping"
  | "fraud_detection"
  | "price_analysis"
  | "moderation"
  | "user_support"
  | "seo_optimization";

// AI Action
export interface AIAction {
  id: string;
  function: AIFunction;
  type: "manual" | "scheduled" | "automatic";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  result?: AIActionResult;
  error?: string;
  metadata?: Record<string, any>;
}

// AI Action Result
export interface AIActionResult {
  success: boolean;
  itemsProcessed: number;
  itemsAffected: number;
  duration: number;
  details?: string;
  data?: any;
}

// AI Decision (for lazy mode approval)
export interface AIDecision {
  id: string;
  function: AIFunction;
  action: string;
  description: string;
  impact: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: Date;
  expiresAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  data?: any;
}

// Listing for AI analysis
export interface ListingForAnalysis {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  propertyType: string;
  location: {
    city: string;
    neighborhood?: string;
    lat?: number;
    lng?: number;
  };
  features: {
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    floor?: number;
    hasParking?: boolean;
    hasPool?: boolean;
    hasGarden?: boolean;
  };
  images: string[];
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Fraud Detection Result
export interface FraudDetectionResult {
  listingId: string;
  isSuspicious: boolean;
  riskScore: number; // 0-100
  flags: FraudFlag[];
  recommendation: "approve" | "review" | "reject";
  details: string;
}

export interface FraudFlag {
  type:
    | "price_anomaly"
    | "duplicate_images"
    | "suspicious_contact"
    | "fake_location"
    | "copy_paste_description"
    | "new_account"
    | "rapid_changes";
  severity: "low" | "medium" | "high";
  description: string;
  confidence: number;
}

// Price Analysis Result
export interface PriceAnalysisResult {
  listingId: string;
  estimatedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  deviation: number; // percentage from market average
  pricePerSqm: number;
  marketComparison: "below" | "average" | "above";
  similarListings: number;
  confidence: number;
  factors: PriceFactor[];
}

export interface PriceFactor {
  name: string;
  impact: number; // positive or negative percentage
  description: string;
}

// Scraping Result
export interface ScrapingResult {
  source: string;
  totalFound: number;
  newListings: number;
  updatedListings: number;
  failedListings: number;
  duration: number;
  errors: string[];
}

// Moderation Result
export interface ModerationResult {
  listingId: string;
  approved: boolean;
  issues: ModerationIssue[];
  autoFixed: string[];
  requiresManualReview: boolean;
}

export interface ModerationIssue {
  type:
    | "inappropriate_content"
    | "contact_in_description"
    | "misleading_title"
    | "poor_quality_images"
    | "incomplete_data";
  severity: "low" | "medium" | "high";
  field: string;
  description: string;
  suggestion?: string;
}

// SEO Optimization Result
export interface SEOOptimizationResult {
  listingId: string;
  originalScore: number;
  optimizedScore: number;
  improvements: SEOImprovement[];
}

export interface SEOImprovement {
  field: string;
  original: string;
  optimized: string;
  improvement: string;
}
