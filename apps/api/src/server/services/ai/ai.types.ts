import type { AIAnalysisResult } from '@/shared/types';
import type { ParsedQuery } from '@/server/services/search/search.types';

export interface AIEngineService {
  /**
   * Analyze property images for authenticity, quality, and content
   */
  analyzeImages(images: ImageInput[]): Promise<ImageAnalysisResult>;

  /**
   * Generate marketing content for a listing
   */
  generateContent(
    listing: ListingInput,
    images: ImageAnalysisResult
  ): Promise<GeneratedContent>;

  /**
   * Estimate property value based on characteristics and location
   */
  estimateValue(listing: ListingInput): Promise<ValuationResult>;

  /**
   * Detect potential fraud indicators
   */
  detectFraud(listing: ListingInput): Promise<FraudAnalysis>;

  /**
   * Generate text embedding for semantic search
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embedding for a listing (combines multiple fields)
   */
  generateListingEmbedding(listing: ListingInput): Promise<number[]>;

  /**
   * Parse natural language search query into structured filters
   */
  parseSearchQuery(query: string): Promise<ParsedQuery>;
}

export interface ImageInput {
  base64?: string;
  url?: string;
  mimeType: string;
  originalName?: string;
}

export interface ImageAnalysisResult {
  images: {
    url?: string;
    index: number;
    roomType: string;
    isAiGenerated: boolean;
    isEdited: boolean;
    authenticityScore: number;
    qualityScore: number;
    issues: {
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }[];
  }[];
  overall: {
    authenticityScore: number;
    qualityScore: number;
    isAiGenerated: boolean;
    isEdited: boolean;
    summary: string;
  };
}

export interface GeneratedContent {
  title: string;
  description: string;
  highlights: string[];
  targetAudience: string;
}

export interface ValuationResult {
  estimatedPrice: {
    min: number;
    max: number;
    median: number;
  };
  pricePerSqm: {
    min: number;
    max: number;
  };
  confidence: number;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  comparables?: {
    address: string;
    price: number;
    sizeSqm: number;
    similarity: number;
  }[];
}

export interface FraudAnalysis {
  riskScore: number; // 0-100, higher = more risky
  riskLevel: 'low' | 'medium' | 'high';
  indicators: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
  }[];
  recommendations: string[];
}

export interface ListingInput {
  title?: string;
  description?: string;
  propertyType?: string;
  operationType?: string;
  price?: number;
  sizeSqm?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  city?: string;
  neighborhood?: string;
  address?: string;
  features?: string[];
}
