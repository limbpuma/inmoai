"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/search/SearchBar";
import { FiltersSidebar } from "@/components/search/FiltersSidebar";
import { ListingCard, type Listing } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Grid3X3, List, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Mock data for testing
const MOCK_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "Ático luminoso con terraza panorámica",
    price: 425000,
    location: "Chamberí, Madrid",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop",
    specs: { beds: 3, baths: 2, sqm: 120 },
    score: 94,
    source: "Idealista",
  },
  {
    id: "2",
    title: "Piso reformado cerca del Retiro",
    price: 380000,
    location: "Retiro, Madrid",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
    specs: { beds: 2, baths: 1, sqm: 85 },
    score: 88,
    source: "Fotocasa",
  },
  {
    id: "3",
    title: "Dúplex con jardín privado",
    price: 520000,
    location: "Pozuelo, Madrid",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
    specs: { beds: 4, baths: 3, sqm: 180 },
    score: 96,
    source: "Idealista",
  },
  {
    id: "4",
    title: "Estudio moderno en el centro",
    price: 195000,
    location: "Sol, Madrid",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
    specs: { beds: 1, baths: 1, sqm: 45 },
    score: 72,
    source: "Fotocasa",
  },
  {
    id: "5",
    title: "Chalet independiente con piscina",
    price: 890000,
    location: "La Moraleja, Madrid",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop",
    specs: { beds: 5, baths: 4, sqm: 350 },
    score: 91,
    source: "Idealista",
  },
  {
    id: "6",
    title: "Piso con vistas al parque",
    price: 310000,
    location: "Moncloa, Madrid",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
    specs: { beds: 3, baths: 2, sqm: 95 },
    score: 85,
    source: "Habitaclia",
  },
];

export default function SearchPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSearch = (query: string) => {
    console.log("Search:", query);
    // TODO: Implement actual search via tRPC
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
                  {MOCK_LISTINGS.length} resultados encontrados
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
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                : "flex flex-col gap-4"
            }>
              {MOCK_LISTINGS.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Load More */}
            <div className="mt-8 text-center">
              <Button variant="outline" size="lg">
                Cargar más resultados
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
