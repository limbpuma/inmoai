"use client";

import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { SearchFilters, ListingSummary } from "@inmoai/shared";

export interface SemanticSearchState {
  query: string;
  parsedFilters: Partial<SearchFilters> | null;
  isParsingQuery: boolean;
  isSearching: boolean;
  results: ListingSummary[];
  error: string | null;
}

export interface UseSemanticSearchFlowOptions {
  onFiltersExtracted?: (filters: Partial<SearchFilters>) => void;
}

export function useSemanticSearchFlow(options: UseSemanticSearchFlowOptions = {}) {
  const [query, setQuery] = useState("");
  const [parsedFilters, setParsedFilters] = useState<Partial<SearchFilters> | null>(null);
  const [activeFilters, setActiveFilters] = useState<Partial<SearchFilters>>({});

  // Parse query mutation - extracts filters from natural language
  const parseQueryMutation = trpc.search.parseQuery.useMutation({
    onSuccess: (data) => {
      if (data.filters) {
        setParsedFilters(data.filters);
        setActiveFilters(prev => ({ ...prev, ...data.filters }));
        options.onFiltersExtracted?.(data.filters);
      }
    },
  });

  // Semantic search query - runs when we have a query
  const semanticSearchQuery = trpc.search.semantic.useQuery(
    { query, filters: activeFilters },
    {
      enabled: query.length > 0 && !parseQueryMutation.isPending,
      staleTime: 30000,
    }
  );

  // Combined loading state
  const isLoading = parseQueryMutation.isPending || semanticSearchQuery.isLoading;

  // Execute the semantic search flow
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);

    // First, parse the natural language query to extract filters
    try {
      await parseQueryMutation.mutateAsync({ query: searchQuery });
    } catch (error) {
      console.error("Error parsing query:", error);
      // Continue with search even if parsing fails
    }
  }, [parseQueryMutation]);

  // Update filters manually (from sidebar)
  const updateFilters = useCallback((filters: Partial<SearchFilters>) => {
    setActiveFilters(prev => ({ ...prev, ...filters }));
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery("");
    setParsedFilters(null);
    setActiveFilters({});
  }, []);

  // Get the results
  const results = useMemo(() => {
    return semanticSearchQuery.data?.listings ?? [];
  }, [semanticSearchQuery.data]);

  // Get AI analysis if available
  const analysis = useMemo(() => {
    return semanticSearchQuery.data?.analysis ?? null;
  }, [semanticSearchQuery.data]);

  return {
    // State
    query,
    parsedFilters,
    activeFilters,
    results,
    analysis,

    // Loading states
    isLoading,
    isParsingQuery: parseQueryMutation.isPending,
    isSearching: semanticSearchQuery.isLoading,

    // Error states
    error: semanticSearchQuery.error?.message ?? parseQueryMutation.error?.message ?? null,

    // Actions
    search,
    updateFilters,
    clearSearch,
    setQuery,
  };
}
