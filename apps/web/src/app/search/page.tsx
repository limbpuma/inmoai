"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/search/SearchBar";
import { FiltersSidebar } from "@/components/search/FiltersSidebar";
import { ListingCard, type Listing } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Grid3X3, List, ArrowUpDown, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useRecentListings } from "@/hooks/useSearch";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch listings from API
  const { data: apiListings, isLoading, isError } = useRecentListings("Madrid", 20);

  // Transform API data to Listing format
  const listings: Listing[] = useMemo(() => {
    if (!apiListings?.listings) return [];

    return apiListings.listings.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      location: [item.neighborhood, item.city].filter(Boolean).join(", "),
      image: item.images?.[0]?.cdnUrl || item.images?.[0]?.originalUrl ||
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
      specs: {
        beds: item.bedrooms ?? 0,
        baths: item.bathrooms ?? 0,
        sqm: item.sizeSqm ?? 0,
      },
      score: item.authenticityScore ?? 0,
      source: item.source?.name ?? "Desconocido",
    }));
  }, [apiListings]);

  const handleSearch = (query: string) => {
    console.log("Search:", query);
    // TODO: Implement semantic search via tRPC
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Search Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <SearchBar
            variant="minimal"
            onSearch={handleSearch}
            placeholder="Buscar por zona, características..."
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-4">
              <FiltersSidebar />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">Propiedades en Madrid</h1>
                <p className="text-muted-foreground">
                  {isLoading ? "Buscando..." : `${listings.length} resultados encontrados`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile Filters Button */}
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="p-6">
                      <FiltersSidebar onClose={() => setFiltersOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort Select */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevancia</SelectItem>
                    <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
                    <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
                    <SelectItem value="date">Más recientes</SelectItem>
                    <SelectItem value="authenticity">Mayor verificación</SelectItem>
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
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Error al cargar las propiedades. Por favor, intenta de nuevo.
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reintentar
                </Button>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No se encontraron propiedades con los filtros seleccionados.
                </p>
              </div>
            ) : (
              <div className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              }>
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}

            {/* Load More */}
            {listings.length > 0 && (
              <div className="mt-8 text-center">
                <Button variant="outline" size="lg" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cargar más resultados
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
