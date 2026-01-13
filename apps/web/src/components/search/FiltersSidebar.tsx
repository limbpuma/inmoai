"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw, ShieldCheck } from "lucide-react";

interface FiltersSidebarProps {
  onClose?: () => void;
}

export function FiltersSidebar({ onClose }: FiltersSidebarProps) {
  const [priceRange, setPriceRange] = useState([100000, 500000]);
  const [sizeRange, setSizeRange] = useState([50, 200]);
  const [minScore, setMinScore] = useState([70]);

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    }
    return `${(value / 1000).toFixed(0)}k€`;
  };

  const handleReset = () => {
    setPriceRange([100000, 500000]);
    setSizeRange([50, 200]);
    setMinScore([70]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filtros</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Operation Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Tipo de operación</Label>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            Comprar
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Alquilar
          </Button>
        </div>
      </div>

      <Separator />

      {/* Property Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Tipo de inmueble</Label>
        <Select defaultValue="all">
          <SelectTrigger>
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="apartment">Piso</SelectItem>
            <SelectItem value="house">Casa</SelectItem>
            <SelectItem value="penthouse">Ático</SelectItem>
            <SelectItem value="duplex">Dúplex</SelectItem>
            <SelectItem value="studio">Estudio</SelectItem>
            <SelectItem value="chalet">Chalet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Precio</Label>
          <span className="text-sm text-muted-foreground">
            {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
          </span>
        </div>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={50000}
          max={2000000}
          step={10000}
          className="w-full"
        />
      </div>

      <Separator />

      {/* Size Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Superficie</Label>
          <span className="text-sm text-muted-foreground">
            {sizeRange[0]} - {sizeRange[1]} m²
          </span>
        </div>
        <Slider
          value={sizeRange}
          onValueChange={setSizeRange}
          min={20}
          max={500}
          step={10}
          className="w-full"
        />
      </div>

      <Separator />

      {/* Rooms */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Habitaciones</Label>
        <div className="flex gap-2">
          {["1", "2", "3", "4", "5+"].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="sm"
              className="flex-1 px-2"
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Bathrooms */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Baños</Label>
        <div className="flex gap-2">
          {["1", "2", "3", "4+"].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="sm"
              className="flex-1 px-2"
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Authenticity Score */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Verificación mínima
          </Label>
          <Badge variant="secondary">{minScore[0]}%</Badge>
        </div>
        <Slider
          value={minScore}
          onValueChange={setMinScore}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Solo mostrar propiedades con score de autenticidad mayor a {minScore[0]}%
        </p>
      </div>

      <Separator />

      {/* Features */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Características</Label>
        <div className="space-y-2">
          {[
            { id: "parking", label: "Parking" },
            { id: "elevator", label: "Ascensor" },
            { id: "terrace", label: "Terraza" },
            { id: "garden", label: "Jardín" },
            { id: "pool", label: "Piscina" },
            { id: "ac", label: "Aire acondicionado" },
          ].map((feature) => (
            <div key={feature.id} className="flex items-center space-x-2">
              <Checkbox id={feature.id} />
              <Label
                htmlFor={feature.id}
                className="text-sm font-normal cursor-pointer"
              >
                {feature.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sources */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Fuentes</Label>
        <div className="space-y-2">
          {[
            { id: "idealista", label: "Idealista" },
            { id: "fotocasa", label: "Fotocasa" },
            { id: "habitaclia", label: "Habitaclia" },
          ].map((source) => (
            <div key={source.id} className="flex items-center space-x-2">
              <Checkbox id={source.id} defaultChecked />
              <Label
                htmlFor={source.id}
                className="text-sm font-normal cursor-pointer"
              >
                {source.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Button (Mobile) */}
      {onClose && (
        <Button className="w-full mt-4" onClick={onClose}>
          Aplicar filtros
        </Button>
      )}
    </div>
  );
}
