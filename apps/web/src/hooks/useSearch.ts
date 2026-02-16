"use client";

import { trpc } from "@/lib/trpc";
import type { SearchFilters } from "@inmoai/shared";

export function useSearchListings(filters: Partial<SearchFilters>) {
  return trpc.search.filter.useQuery(
    {
      ...filters,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    },
    {
      enabled: true,
      staleTime: 30000, // 30 seconds
    }
  );
}

export function useSemanticSearch(query: string, filters?: Partial<SearchFilters>) {
  return trpc.search.semantic.useQuery(
    { query, filters },
    {
      enabled: query.length > 0,
      staleTime: 30000,
    }
  );
}

export function useAutocomplete(query: string, limit = 10) {
  return trpc.search.autocomplete.useQuery(
    { query, limit },
    {
      enabled: query.length >= 2,
      staleTime: 10000, // 10 seconds
    }
  );
}

export function useRecentListings(city?: string, limit = 12, operationType?: "sale" | "rent") {
  return trpc.listings.getRecent.useQuery(
    { city, limit, operationType },
    {
      staleTime: 60000, // 1 minute
    }
  );
}

export function useListingDetail(id: string) {
  return trpc.listings.getById.useQuery(
    { id },
    {
      enabled: !!id,
      staleTime: 60000,
    }
  );
}
