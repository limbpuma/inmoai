"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  Trash2,
  RotateCcw,
  Calendar,
  Filter,
  MapPin,
  Home,
  Euro,
} from "lucide-react";

// Mock data
const mockHistory = [
  {
    id: "1",
    query: "Piso 3 habitaciones Barcelona cerca del mar",
    filters: { city: "Barcelona", bedrooms: 3, priceMax: 400000 },
    results: 24,
    timestamp: "2024-01-23T10:30:00",
  },
  {
    id: "2",
    query: "Casa con jardin Madrid norte",
    filters: { city: "Madrid", type: "casa", hasGarden: true },
    results: 8,
    timestamp: "2024-01-23T08:15:00",
  },
  {
    id: "3",
    query: "Atico luminoso Valencia centro",
    filters: { city: "Valencia", type: "atico" },
    results: 15,
    timestamp: "2024-01-22T18:45:00",
  },
  {
    id: "4",
    query: "Apartamento 2 habitaciones Barcelona Gracia barato",
    filters: { city: "Barcelona", bedrooms: 2, priceMax: 250000 },
    results: 31,
    timestamp: "2024-01-22T14:20:00",
  },
  {
    id: "5",
    query: "Piso reformado Salamanca Madrid",
    filters: { city: "Madrid", neighborhood: "Salamanca" },
    results: 12,
    timestamp: "2024-01-21T11:00:00",
  },
  {
    id: "6",
    query: "Estudio centrico Valencia",
    filters: { city: "Valencia", type: "estudio" },
    results: 45,
    timestamp: "2024-01-20T09:30:00",
  },
];

export default function HistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [history, setHistory] = useState(mockHistory);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoy, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Ayer, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} dias`;
    }
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const filteredHistory = history
    .filter((h) => {
      const matchesSearch = h.query.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = filterCity === "all" || h.filters.city?.toLowerCase() === filterCity;
      return matchesSearch && matchesCity;
    });

  const handleRemove = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleClearAll = () => {
    setHistory([]);
  };

  const handleRepeatSearch = useCallback((searchItem: typeof mockHistory[0]) => {
    // Navigate to search with the saved filters
    router.push(`/search?q=${encodeURIComponent(searchItem.query)}`);
  }, [router]);

  const renderFilterBadges = (filters: typeof mockHistory[0]["filters"]) => {
    const badges = [];
    if (filters.city) {
      badges.push(
        <Badge key="city" variant="secondary" className="text-xs">
          <MapPin className="h-3 w-3 mr-1" />
          {filters.city}
        </Badge>
      );
    }
    if (filters.bedrooms) {
      badges.push(
        <Badge key="bedrooms" variant="secondary" className="text-xs">
          <Home className="h-3 w-3 mr-1" />
          {filters.bedrooms} hab.
        </Badge>
      );
    }
    if (filters.priceMax) {
      badges.push(
        <Badge key="price" variant="secondary" className="text-xs">
          <Euro className="h-3 w-3 mr-1" />
          Max {(filters.priceMax / 1000).toFixed(0)}k
        </Badge>
      );
    }
    return badges;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Historial de busquedas
          </h1>
          <p className="text-muted-foreground">
            Revisa y repite tus busquedas anteriores
          </p>
        </div>
        {history.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-600"
            onClick={handleClearAll}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar historial
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en historial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            <SelectItem value="madrid">Madrid</SelectItem>
            <SelectItem value="barcelona">Barcelona</SelectItem>
            <SelectItem value="valencia">Valencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filteredHistory.length} busquedas</span>
        <span>|</span>
        <span>
          {filteredHistory.reduce((acc, h) => acc + h.results, 0)} resultados totales
        </span>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-1">Sin historial</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || filterCity !== "all"
                ? "No se encontraron busquedas con ese criterio"
                : "Tus busquedas apareceran aqui"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Search info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <Search className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.query}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(item.timestamp)}</span>
                          <span>·</span>
                          <span>{item.results} resultados</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {renderFilterBadges(item.filters)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRepeatSearch(item)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Repetir
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
