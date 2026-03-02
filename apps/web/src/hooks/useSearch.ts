"use client";

import { trpc } from "@/lib/trpc";
import { getMockRecentListings, getMockListingById } from "@/data/mock-listings";
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
      staleTime: 30000,
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
      staleTime: 10000,
    }
  );
}

export function useRecentListings(city?: string, limit = 12, operationType?: "sale" | "rent") {
  const query = trpc.listings.getRecent.useQuery(
    { city, limit, operationType },
    {
      staleTime: 60000,
      retry: 1,
    }
  );

  // Fallback to mock data when API is unavailable (portfolio demo mode)
  if (query.isError || (query.isFetched && !query.data)) {
    return {
      ...query,
      data: getMockRecentListings(city, limit, operationType),
      isLoading: false,
      isError: false,
    };
  }

  return query;
}

export function useListingDetail(id: string) {
  const query = trpc.listings.getById.useQuery(
    { id },
    {
      enabled: !!id,
      staleTime: 60000,
      retry: 1,
    }
  );

  // Fallback to mock data when API is unavailable
  if (query.isError || (query.isFetched && !query.data)) {
    const mockListing = getMockListingById(id);
    if (mockListing) {
      return {
        ...query,
        data: mockListing,
        isLoading: false,
        isError: false,
      };
    }
  }

  return query;
}
