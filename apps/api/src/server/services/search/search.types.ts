import type { SearchFilters, SearchResult, ListingSummary } from '@/shared/types';

export interface SearchService {
  /**
   * Búsqueda semántica con lenguaje natural
   */
  semanticSearch(query: string, filters?: Partial<SearchFilters>): Promise<SearchResult>;

  /**
   * Búsqueda tradicional con filtros
   */
  filterSearch(filters: SearchFilters): Promise<SearchResult>;

  /**
   * Búsqueda híbrida (semántica + filtros)
   */
  hybridSearch(query: string, filters: SearchFilters): Promise<SearchResult>;

  /**
   * Autocompletado de búsqueda
   */
  autocomplete(partial: string, limit?: number): Promise<Suggestion[]>;

  /**
   * Propiedades similares a una dada
   */
  findSimilar(listingId: string, limit?: number): Promise<ListingSummary[]>;

  /**
   * Parsear query en lenguaje natural a filtros
   */
  parseNaturalLanguageQuery(query: string): Promise<ParsedQuery>;
}

export interface Suggestion {
  type: 'city' | 'neighborhood' | 'query' | 'listing';
  value: string;
  label: string;
  count?: number;
  metadata?: Record<string, unknown>;
}

export interface ParsedQuery {
  originalQuery: string;
  filters: Partial<SearchFilters>;
  interpretation: string;
  confidence: number;
  suggestions?: string[];
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}
