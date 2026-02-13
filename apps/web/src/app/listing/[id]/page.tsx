"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import {
  ImageGallery,
  PropertyFeatures,
  ContactForm,
  PriceHistoryChart,
  FraudAlertBanner,
  PriceComparison,
  ExternalSourceCard,
  AvailabilityIndicator,
  ImprovementSuggestions,
} from "@/components/listing";
import { AuthenticityBadge } from "@/components/ui/AuthenticityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Building2,
  Calendar,
  Zap,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

const propertyTypeLabels: Record<string, string> = {
  apartment: "Piso",
  house: "Casa",
  studio: "Estudio",
  penthouse: "Ático",
  duplex: "Dúplex",
  loft: "Loft",
  villa: "Villa",
  chalet: "Chalet",
  townhouse: "Adosado",
  land: "Terreno",
  commercial: "Local comercial",
  office: "Oficina",
  garage: "Garaje",
  storage: "Trastero",
};

export default function ListingPage({ params }: ListingPageProps) {
  const { id } = use(params);

  const { data: listing, isLoading, error } = trpc.listings.getById.useQuery(
    { id },
    { retry: false }
  );

  if (error) {
    notFound();
  }

  if (isLoading) {
    return <ListingPageSkeleton />;
  }

  if (!listing) {
    notFound();
  }

  const formattedPrice = listing.price
    ? new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(listing.price)
    : "Precio a consultar";

  const pricePerSqm = listing.pricePerSqm
    ? new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(listing.pricePerSqm) + "/m²"
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/search"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a búsqueda
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{listing.city}</span>
            {listing.neighborhood && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">{listing.neighborhood}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fraud Alert Banner - Shows at top if issues detected */}
      <div className="container mx-auto px-4 pt-4">
        <FraudAlertBanner
          authenticityScore={listing.authenticityScore}
          isAiGenerated={listing.images?.some((img: { isAiGenerated: boolean | null }) => img.isAiGenerated) ?? null}
          aiIssues={listing.aiIssues}
        />
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <ImageGallery images={listing.images} title={listing.title} />

            {/* Title & Price Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {propertyTypeLabels[listing.propertyType] || listing.propertyType}
                  </Badge>
                  <Badge variant={listing.operationType === "sale" ? "default" : "outline"}>
                    {listing.operationType === "sale" ? "Venta" : "Alquiler"}
                  </Badge>
                  <AuthenticityBadge
                    score={listing.authenticityScore ?? 0}
                    issues={listing.aiIssues}
                    isAiGenerated={listing.images?.some((img: { isAiGenerated: boolean | null }) => img.isAiGenerated) ?? null}
                  />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">{listing.title}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {[listing.address, listing.neighborhood, listing.city]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  {formattedPrice}
                </p>
                {pricePerSqm && (
                  <p className="text-sm text-muted-foreground">{pricePerSqm}</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {listing.sizeSqm && (
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{listing.sizeSqm}</p>
                  <p className="text-sm text-muted-foreground">m² construidos</p>
                </div>
              )}
              {listing.bedrooms !== null && (
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{listing.bedrooms}</p>
                  <p className="text-sm text-muted-foreground">Habitaciones</p>
                </div>
              )}
              {listing.bathrooms !== null && (
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{listing.bathrooms}</p>
                  <p className="text-sm text-muted-foreground">Baños</p>
                </div>
              )}
              {listing.floor !== null && (
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold">
                    {listing.floor === 0 ? "Bajo" : `${listing.floor}º`}
                  </p>
                  <p className="text-sm text-muted-foreground">Planta</p>
                </div>
              )}
            </div>

            {/* AI Analysis Section */}
            {(listing.aiHighlights || listing.aiIssues) && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Análisis IA
                </h2>

                {listing.aiHighlights && listing.aiHighlights.length > 0 && (
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <h3 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Puntos destacados
                    </h3>
                    <ul className="space-y-1">
                      {listing.aiHighlights.map((highlight: string, i: number) => (
                        <li key={i} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {listing.aiIssues && listing.aiIssues.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                    <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Aspectos a considerar
                    </h3>
                    <ul className="space-y-2">
                      {listing.aiIssues.map((issue: { type: string; description: string; severity: "low" | "medium" | "high" }, i: number) => (
                        <li key={i} className="text-sm">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                            issue.severity === "high"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : issue.severity === "medium"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}>
                            {issue.severity === "high" ? "Alto" : issue.severity === "medium" ? "Medio" : "Bajo"}
                          </span>
                          <span className="text-amber-700 dark:text-amber-300">{issue.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Descripción</h2>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-line">
                  {listing.aiDescription || listing.description || "Sin descripción disponible."}
                </p>
              </div>
            </div>

            {/* Features */}
            <PropertyFeatures listing={listing} />

            {/* Additional Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Información adicional</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {listing.yearBuilt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Año construcción: {listing.yearBuilt}</span>
                  </div>
                )}
                {listing.energyRating && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span>Certificación energética: {listing.energyRating}</span>
                  </div>
                )}
                {listing.orientation && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Orientación: {listing.orientation}</span>
                  </div>
                )}
                {listing.source && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span>Fuente: {listing.source.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price History */}
            {listing.priceHistory && listing.priceHistory.length > 0 && (
              <PriceHistoryChart
                priceHistory={listing.priceHistory}
                currentPrice={listing.price}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Availability Indicator - KILLER FEATURE */}
              <AvailabilityIndicator
                firstSeenAt={listing.firstSeenAt}
                lastSeenAt={listing.lastSeenAt}
                priceHistory={listing.priceHistory}
                authenticityScore={listing.authenticityScore}
                status={listing.status}
              />

              {/* Contact/Source Card - Conditional based on source */}
              {listing.source?.id === "inmoai" ? (
                // Propiedad nativa de InmoAI - permitir contacto directo
                <ContactForm listingId={listing.id} listingTitle={listing.title} />
              ) : (
                // Propiedad de terceros - mostrar link al portal original
                <ExternalSourceCard
                  sourceName={listing.source?.name || "Portal externo"}
                  sourceUrl={listing.source?.website || null}
                  externalUrl={listing.externalUrl}
                  firstSeenAt={listing.firstSeenAt}
                  lastSeenAt={listing.lastSeenAt}
                  priceDropCount={
                    listing.priceHistory
                      ? listing.priceHistory.filter(
                          (p: { price: number }, i: number, arr: { price: number }[]) =>
                            i > 0 && p.price < arr[i - 1].price
                        ).length
                      : 0
                  }
                />
              )}

              {/* Price Comparison - AI Valuation */}
              <PriceComparison
                currentPrice={listing.price}
                valuationEstimate={listing.valuationEstimate}
                valuationConfidence={listing.valuationConfidence}
              />

              {/* Improvement Suggestions - Future Marketplace */}
              {listing.improvements && listing.improvements.length > 0 && (
                <ImprovementSuggestions
                  improvements={listing.improvements}
                  currentPrice={listing.price}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ListingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="aspect-[16/9] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}