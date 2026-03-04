"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/search/SearchBar";
import { FiltersSidebar } from "@/components/search/FiltersSidebar";
import { ListingCard, type Listing } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Grid3X3, List, ArrowUpDown, Loader2, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useRecentListings } from "@/hooks/useSearch";
import { useSemanticSearchFlow } from "@/hooks/useSemanticSearchFlow";
import { Skeleton } from "@/components/ui/skeleton";

function SearchPageContent({
  initialQuery,
  initialOperationType = "sale"
}: {
  initialQuery: string;
  initialOperationType?: "sale" | "rent";
}) {
  const t = useTranslations("search");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [operationType, setOperationType] = useState<"sale" | "rent">(initialOperationType);
  const [visibleCount, setVisibleCount] = useState(9);

  // Semantic search flow
  const {
    query,
    results: semanticResults,
    analysis,
    isLoading: isSemanticLoading,
    isParsingQuery,
    search,
    setQuery,
    parsedFilters,
  } = useSemanticSearchFlow();

  // Fallback to recent listings when no search query
  const { data: recentListings, isLoading: isRecentLoading } = useRecentListings(
    parsedFilters?.city ?? "Madrid",
    50,
    operationType
  );

  // Run initial search if query param exists
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      search(initialQuery);
    }
  }, [initialQuery]);

  // Determine which listings to show
  const isSearchActive = query.length > 0;
  const apiListings = isSearchActive ? semanticResults : recentListings;
  const isLoading = isSearchActive ? isSemanticLoading : isRecentLoading;

  // Transform API data to Listing format
  const listings: Listing[] = useMemo(() => {
    if (!apiListings || !Array.isArray(apiListings)) return [];

    return apiListings.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      location: [item.neighborhood, item.city].filter(Boolean).join(", "),
      image: item.images?.[0]?.url || item.imageUrl ||
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
      specs: {
        beds: item.bedrooms ?? 0,
        baths: item.bathrooms ?? 0,
        sqm: item.sizeSqm ?? item.sqMeters ?? 0,
      },
      score: item.authenticityScore ?? 0,
      source: item.source?.name ?? "InmoAI",
    }));
  }, [apiListings]);

  // Sort listings
  const sortedListings = useMemo(() => {
    const sorted = [...listings];
    switch (sortBy) {
      case "price_asc":
        return sorted.sort((a, b) => a.price - b.price);
      case "price_desc":
        return sorted.sort((a, b) => b.price - a.price);
      case "authenticity":
        return sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      default:
        return sorted;
    }
  }, [listings, sortBy]);

  // Reset pagination when listings or sort change
  useEffect(() => {
    setVisibleCount(9);
  }, [apiListings, sortBy]);

  const handleSearch = (searchQuery: string) => {
    search(searchQuery);
  };

  // Paginate sorted listings
  const visibleListings = sortedListings.slice(0, visibleCount);
  const hasMore = visibleCount < sortedListings.length;

  // Dynamic title based on search
  const pageTitle = isSearchActive
    ? t("resultsFor", { query })
    : t("propertiesIn", { city: parsedFilters?.city ?? "Madrid" });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Search Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <SearchBar
            variant="minimal"
            onSearch={handleSearch}
            onQueryChange={setQuery}
            isLoading={isSemanticLoading}
            defaultValue={initialQuery}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* AI Analysis Banner */}
        {analysis && isSearchActive && (
          <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary mb-1">{t("aiAnalysis")}</p>
                <p className="text-sm text-muted-foreground">{analysis}</p>
              </div>
            </div>
          </div>
        )}

        {/* Parsed Filters Indicator */}
        {isParsingQuery && (
          <div className="mb-6 p-3 rounded-lg bg-muted/50 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("analyzing")}
          </div>
        )}

        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-4">
              <FiltersSidebar initialFilters={{ ...parsedFilters, operationType }} />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">{pageTitle}</h1>
                <p className="text-muted-foreground">
                  {isLoading ? t("searching") : `${t("resultsFound", { count: sortedListings.length })}${hasMore ? ` (${t("showing", { count: visibleCount })})` : ""}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile Filters Button */}
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      {t("sortBy")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="p-6">
                      <FiltersSidebar
                        onClose={() => setFiltersOpen(false)}
                        initialFilters={{ ...parsedFilters, operationType }}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort Select */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={t("sortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">{t("sortRelevance")}</SelectItem>
                    <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
                    <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
                    <SelectItem value="date">{t("sortDate")}</SelectItem>
                    <SelectItem value="authenticity">{t("sortAuthenticity")}</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="hidden sm:flex border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              }>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : visibleListings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {isSearchActive
                    ? t("noResultsSearch")
                    : t("noResultsFilter")}
                </p>
              </div>
            ) : (
              <div className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              }>
                {visibleListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount((prev) => prev + 9)}
                >
                  {t("loadMore", { remaining: sortedListings.length - visibleCount })}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function SearchPageWrapper() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const mode = searchParams.get("mode"); // 'rent' or null (sale)
  const initialOperationType = mode === "rent" ? "rent" : "sale";
  return <SearchPageContent initialQuery={initialQuery} initialOperationType={initialOperationType} />;
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-12 w-full mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchPageWrapper />
    </Suspense>
  );
}
