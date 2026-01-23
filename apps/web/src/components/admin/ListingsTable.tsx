"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  EyeOff,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Bed,
  Bath,
  Maximize,
} from "lucide-react";

// Mock data
const mockListings = [
  {
    id: "1",
    title: "Piso reformado en Eixample",
    price: 385000,
    city: "Barcelona",
    address: "Calle Arago 234",
    bedrooms: 3,
    bathrooms: 2,
    area: 95,
    type: "sale",
    source: "idealista",
    status: "active",
    authenticityScore: 92,
    createdAt: "2024-01-20",
    views: 1234,
  },
  {
    id: "2",
    title: "Atico con terraza en Salamanca",
    price: 890000,
    city: "Madrid",
    address: "Calle Serrano 45",
    bedrooms: 4,
    bathrooms: 3,
    area: 180,
    type: "sale",
    source: "fotocasa",
    status: "active",
    authenticityScore: 88,
    createdAt: "2024-01-19",
    views: 2345,
  },
  {
    id: "3",
    title: "Estudio centrico",
    price: 850,
    city: "Valencia",
    address: "Calle Colon 12",
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    type: "rent",
    source: "habitaclia",
    status: "pending",
    authenticityScore: 75,
    createdAt: "2024-01-18",
    views: 567,
  },
  {
    id: "4",
    title: "Casa con precio sospechoso",
    price: 50000,
    city: "Barcelona",
    address: "Via Augusta 100",
    bedrooms: 5,
    bathrooms: 3,
    area: 200,
    type: "sale",
    source: "idealista",
    status: "flagged",
    authenticityScore: 23,
    createdAt: "2024-01-17",
    views: 8920,
  },
  {
    id: "5",
    title: "Piso en Gracia",
    price: 295000,
    city: "Barcelona",
    address: "Calle Verdi 78",
    bedrooms: 2,
    bathrooms: 1,
    area: 65,
    type: "sale",
    source: "fotocasa",
    status: "active",
    authenticityScore: 95,
    createdAt: "2024-01-16",
    views: 789,
  },
];

interface ListingsTableProps {
  searchQuery: string;
  cityFilter: string;
  statusFilter: string;
  sourceFilter: string;
}

export function ListingsTable({
  searchQuery,
  cityFilter,
  statusFilter,
  sourceFilter,
}: ListingsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter listings
  const filteredListings = mockListings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = cityFilter === "all" || listing.city.toLowerCase() === cityFilter;
    const matchesStatus = statusFilter === "all" || listing.status === statusFilter;
    const matchesSource = sourceFilter === "all" || listing.source === sourceFilter;
    return matchesSearch && matchesCity && matchesStatus && matchesSource;
  });

  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedListings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedListings.map((l) => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Activo
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Pendiente
          </Badge>
        );
      case "flagged":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Flagged
          </Badge>
        );
      case "hidden":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Oculto
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 50) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const formatPrice = (price: number, type: string) => {
    if (type === "rent") {
      return `${price}€/mes`;
    }
    return `${price.toLocaleString("es-ES")}€`;
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} seleccionados
          </span>
          <Button variant="outline" size="sm">
            <CheckCircle className="h-4 w-4 mr-1" />
            Aprobar
          </Button>
          <Button variant="outline" size="sm">
            <EyeOff className="h-4 w-4 mr-1" />
            Ocultar
          </Button>
          <Button variant="outline" size="sm" className="text-red-600">
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === paginatedListings.length && paginatedListings.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Propiedad</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedListings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No se encontraron listings
                </TableCell>
              </TableRow>
            ) : (
              paginatedListings.map((listing) => (
                <TableRow
                  key={listing.id}
                  className={`hover:bg-muted/50 ${listing.status === "flagged" ? "bg-red-50/50" : ""}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(listing.id)}
                      onCheckedChange={() => toggleSelect(listing.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <p className="font-medium truncate">{listing.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{listing.city}, {listing.address}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Bed className="h-3 w-3" />
                          {listing.bedrooms}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="h-3 w-3" />
                          {listing.bathrooms}
                        </span>
                        <span className="flex items-center gap-1">
                          <Maximize className="h-3 w-3" />
                          {listing.area}m²
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">
                      {formatPrice(listing.price, listing.type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getScoreColor(listing.authenticityScore)}
                    >
                      {listing.authenticityScore}%
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(listing.status)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {listing.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {listing.views.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver original
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Ocultar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
          {Math.min(currentPage * itemsPerPage, filteredListings.length)} de{" "}
          {filteredListings.length} listings
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Pagina {currentPage} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
