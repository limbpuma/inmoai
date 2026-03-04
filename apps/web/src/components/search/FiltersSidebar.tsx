"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import type { SearchFilters } from "@inmoai/shared";

interface FiltersSidebarProps {
  onClose?: () => void;
  initialFilters?: Partial<SearchFilters>;
  onFiltersChange?: (filters: Partial<SearchFilters>) => void;
}

export function FiltersSidebar({ onClose, initialFilters, onFiltersChange }: FiltersSidebarProps) {
  const t = useTranslations("filters");
  const [priceRange, setPriceRange] = useState([
    initialFilters?.minPrice ?? 100000,
    initialFilters?.maxPrice ?? 500000,
  ]);
  const [sizeRange, setSizeRange] = useState([
    initialFilters?.minSize ?? 50,
    initialFilters?.maxSize ?? 200,
  ]);
  const [minScore, setMinScore] = useState([initialFilters?.minAuthenticityScore ?? 70]);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(
    initialFilters?.minBedrooms ?? null
  );
  const [selectedBathrooms, setSelectedBathrooms] = useState<number | null>(
    initialFilters?.minBathrooms ?? null
  );
  const [operationType, setOperationType] = useState<"sale" | "rent">(
    initialFilters?.operationType ?? "sale"
  );
  const [propertyType, setPropertyType] = useState<string>(
    initialFilters?.propertyType ?? "all"
  );

  // Sync with initial filters when they change (intentional state sync with props)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.minPrice !== undefined || initialFilters.maxPrice !== undefined) {
        setPriceRange([
          initialFilters.minPrice ?? 100000,
          initialFilters.maxPrice ?? 500000,
        ]);
      }
      if (initialFilters.minSize !== undefined || initialFilters.maxSize !== undefined) {
        setSizeRange([
          initialFilters.minSize ?? 50,
          initialFilters.maxSize ?? 200,
        ]);
      }
      if (initialFilters.minBedrooms !== undefined) {
        setSelectedBedrooms(initialFilters.minBedrooms);
      }
      if (initialFilters.minBathrooms !== undefined) {
        setSelectedBathrooms(initialFilters.minBathrooms);
      }
      if (initialFilters.operationType) {
        setOperationType(initialFilters.operationType);
      }
      if (initialFilters.propertyType) {
        setPropertyType(initialFilters.propertyType);
      }
    }
  }, [initialFilters]);

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
    setSelectedBedrooms(null);
    setSelectedBathrooms(null);
    setOperationType("sale");
    setPropertyType("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            {t("clear")}
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
        <Label className="text-sm font-medium">{t("operationType")}</Label>
        <div className="flex gap-2">
          <Button
            variant={operationType === "sale" ? "secondary" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setOperationType("sale")}
          >
            {t("buy")}
          </Button>
          <Button
            variant={operationType === "rent" ? "secondary" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setOperationType("rent")}
          >
            {t("rent")}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Property Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("propertyType")}</Label>
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger>
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            <SelectItem value="apartment">{t("apartment")}</SelectItem>
            <SelectItem value="house">{t("house")}</SelectItem>
            <SelectItem value="penthouse">{t("penthouse")}</SelectItem>
            <SelectItem value="duplex">{t("duplex")}</SelectItem>
            <SelectItem value="studio">{t("studio")}</SelectItem>
            <SelectItem value="chalet">{t("chalet")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{t("price")}</Label>
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
          <Label className="text-sm font-medium">{t("size")}</Label>
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
        <Label className="text-sm font-medium">{t("bedrooms")}</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <Button
              key={num}
              variant={selectedBedrooms === num ? "secondary" : "outline"}
              size="sm"
              className="flex-1 px-2"
              onClick={() => setSelectedBedrooms(selectedBedrooms === num ? null : num)}
            >
              {num === 5 ? "5+" : num}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Bathrooms */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("bathrooms")}</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((num) => (
            <Button
              key={num}
              variant={selectedBathrooms === num ? "secondary" : "outline"}
              size="sm"
              className="flex-1 px-2"
              onClick={() => setSelectedBathrooms(selectedBathrooms === num ? null : num)}
            >
              {num === 4 ? "4+" : num}
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
            {t("minVerification")}
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
          {t("minVerificationDesc", { score: minScore[0] })}
        </p>
      </div>

      <Separator />

      {/* Features */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("featuresLabel")}</Label>
        <div className="space-y-2">
          {[
            { id: "parking", label: t("parking") },
            { id: "elevator", label: t("elevator") },
            { id: "terrace", label: t("terrace") },
            { id: "garden", label: t("garden") },
            { id: "pool", label: t("pool") },
            { id: "ac", label: t("ac") },
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

      {/* Verification Status */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("verification")}</Label>
        <div className="space-y-2">
          {[
            { id: "verified", label: t("verifiedCatastro") },
            { id: "pending", label: t("pending") },
            { id: "all", label: t("all") },
          ].map((status) => (
            <div key={status.id} className="flex items-center space-x-2">
              <Checkbox id={status.id} defaultChecked={status.id !== "pending"} />
              <Label
                htmlFor={status.id}
                className="text-sm font-normal cursor-pointer"
              >
                {status.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Button (Mobile) */}
      {onClose && (
        <Button className="w-full mt-4" onClick={onClose}>
          {t("apply")}
        </Button>
      )}
    </div>
  );
}
