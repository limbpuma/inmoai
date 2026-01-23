"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Heart,
  Search,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Trash2,
  ExternalLink,
  Shield,
  AlertTriangle,
} from "lucide-react";

// Mock data - would come from tRPC in production
const mockFavorites = [
  {
    id: "1",
    title: "Piso reformado en Eixample",
    price: 385000,
    location: "Barcelona, Eixample",
    bedrooms: 3,
    bathrooms: 2,
    area: 95,
    authenticityScore: 92,
    savedAt: "2024-01-20",
    source: "idealista",
    image: "/placeholder.jpg",
  },
  {
    id: "2",
    title: "Casa adosada con jardin",
    price: 520000,
    location: "Madrid, Pozuelo",
    bedrooms: 4,
    bathrooms: 3,
    area: 180,
    authenticityScore: 88,
    savedAt: "2024-01-19",
    source: "fotocasa",
    image: "/placeholder.jpg",
  },
  {
    id: "3",
    title: "Atico con terraza panoramica",
    price: 295000,
    location: "Valencia, Ruzafa",
    bedrooms: 2,
    bathrooms: 1,
    area: 75,
    authenticityScore: 45,
    savedAt: "2024-01-18",
    source: "idealista",
    image: "/placeholder.jpg",
  },
  {
    id: "4",
    title: "Estudio centrico",
    price: 145000,
    location: "Barcelona, Gracia",
    bedrooms: 1,
    bathrooms: 1,
    area: 40,
    authenticityScore: 95,
    savedAt: "2024-01-17",
    source: "habitaclia",
    image: "/placeholder.jpg",
  },
];

export default function FavoritesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("savedAt");
  const [favorites, setFavorites] = useState(mockFavorites);

  const filteredFavorites = favorites
    .filter(
      (f) =>
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "score":
          return b.authenticityScore - a.authenticityScore;
        default:
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      }
    });

  const handleRemove = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 50) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Shield className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          Propiedades guardadas
        </h1>
        <p className="text-muted-foreground">
          Gestiona tus propiedades favoritas
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en favoritos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="savedAt">Mas recientes</SelectItem>
            <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
            <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
            <SelectItem value="score">Score de autenticidad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filteredFavorites.length} propiedades</span>
        <span>|</span>
        <span>
          {filteredFavorites.filter((f) => f.authenticityScore >= 80).length} verificadas
        </span>
        <span>|</span>
        <span>
          {filteredFavorites.filter((f) => f.authenticityScore < 50).length} con alerta
        </span>
      </div>

      {/* Properties Grid */}
      {filteredFavorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No hay favoritos</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery
                ? "No se encontraron propiedades con ese criterio"
                : "Guarda propiedades desde la busqueda para verlas aqui"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredFavorites.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="flex">
                {/* Image placeholder */}
                <div className="w-1/3 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center min-h-[160px]">
                  <MapPin className="h-8 w-8 text-primary/50" />
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {property.location}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={getScoreColor(property.authenticityScore)}
                    >
                      {getScoreIcon(property.authenticityScore)}
                      <span className="ml-1">{property.authenticityScore}%</span>
                    </Badge>
                  </div>

                  <div className="text-xl font-bold text-primary mb-3">
                    {property.price.toLocaleString("es-ES")}€
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {property.bedrooms}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {property.bathrooms}
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize className="h-4 w-4" />
                      {property.area}m²
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      via {property.source}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemove(property.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
