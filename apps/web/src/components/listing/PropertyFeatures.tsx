"use client";

import {
  Car,
  Waves,
  Trees,
  Wind,
  Flame,
  Building2,
  Maximize2,
  BedDouble,
  Bath,
  Home,
  Compass,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface PropertyFeaturesProps {
  listing: {
    sizeSqm: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    rooms: number | null;
    floor: number | null;
    totalFloors: number | null;
    hasElevator: boolean | null;
    hasParking: boolean | null;
    hasTerrace: boolean | null;
    hasBalcony: boolean | null;
    hasGarden: boolean | null;
    hasPool: boolean | null;
    hasAirConditioning: boolean | null;
    hasHeating: boolean | null;
    heatingType: string | null;
    orientation: string | null;
    yearBuilt: number | null;
    energyRating: string | null;
  };
}

interface FeatureItemProps {
  icon: React.ReactNode;
  label: string;
  value: boolean | null;
}

function FeatureItem({ icon, label, value }: FeatureItemProps) {
  if (value === null) return null;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        value
          ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300"
          : "bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400"
      }`}
    >
      <div className={value ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      <div className="ml-auto">
        {value ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </div>
  );
}

export function PropertyFeatures({ listing }: PropertyFeaturesProps) {
  const features = [
    {
      icon: <Car className="h-5 w-5" />,
      label: "Parking",
      value: listing.hasParking,
    },
    {
      icon: <Building2 className="h-5 w-5" />,
      label: "Ascensor",
      value: listing.hasElevator,
    },
    {
      icon: <Maximize2 className="h-5 w-5" />,
      label: "Terraza",
      value: listing.hasTerrace,
    },
    {
      icon: <Home className="h-5 w-5" />,
      label: "Balcón",
      value: listing.hasBalcony,
    },
    {
      icon: <Trees className="h-5 w-5" />,
      label: "Jardín",
      value: listing.hasGarden,
    },
    {
      icon: <Waves className="h-5 w-5" />,
      label: "Piscina",
      value: listing.hasPool,
    },
    {
      icon: <Wind className="h-5 w-5" />,
      label: "Aire acondicionado",
      value: listing.hasAirConditioning,
    },
    {
      icon: <Flame className="h-5 w-5" />,
      label: listing.heatingType ? `Calefacción (${listing.heatingType})` : "Calefacción",
      value: listing.hasHeating,
    },
  ];

  const visibleFeatures = features.filter((f) => f.value !== null);

  if (visibleFeatures.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Características</h2>

      {/* Basic Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border">
        {listing.sizeSqm && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Maximize2 className="h-4 w-4" />
              <span className="text-xs">Superficie</span>
            </div>
            <p className="font-semibold">{listing.sizeSqm} m²</p>
          </div>
        )}
        {listing.bedrooms !== null && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <BedDouble className="h-4 w-4" />
              <span className="text-xs">Habitaciones</span>
            </div>
            <p className="font-semibold">{listing.bedrooms}</p>
          </div>
        )}
        {listing.bathrooms !== null && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Bath className="h-4 w-4" />
              <span className="text-xs">Baños</span>
            </div>
            <p className="font-semibold">{listing.bathrooms}</p>
          </div>
        )}
        {listing.floor !== null && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Planta</span>
            </div>
            <p className="font-semibold">
              {listing.floor === 0 ? "Bajo" : `${listing.floor}º`}
              {listing.totalFloors && ` de ${listing.totalFloors}`}
            </p>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {listing.orientation && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <Compass className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Orientación</p>
              <p className="text-sm font-medium">{listing.orientation}</p>
            </div>
          </div>
        )}
        {listing.yearBuilt && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Año construcción</p>
              <p className="text-sm font-medium">{listing.yearBuilt}</p>
            </div>
          </div>
        )}
        {listing.energyRating && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Certificación</p>
              <p className="text-sm font-medium">Clase {listing.energyRating}</p>
            </div>
          </div>
        )}
      </div>

      {/* Feature Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleFeatures.map((feature, index) => (
          <FeatureItem
            key={index}
            icon={feature.icon}
            label={feature.label}
            value={feature.value}
          />
        ))}
      </div>
    </div>
  );
}
