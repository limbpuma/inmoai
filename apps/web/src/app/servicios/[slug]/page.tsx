"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  BadgeCheck,
  Calendar,
  Send,
  PaintBucket,
  Wrench,
  Zap,
  Droplets,
  TreeDeciduous,
  Lightbulb,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderPageProps {
  params: Promise<{ slug: string }>;
}

const categoryConfig: Record<string, { icon: LucideIcon; label: string; color: string; bgColor: string }> = {
  painting: { icon: PaintBucket, label: "Pintura", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  renovation: { icon: Wrench, label: "Reformas", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  electrical: { icon: Zap, label: "Electricidad", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  plumbing: { icon: Droplets, label: "Fontaneria", color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
  garden: { icon: TreeDeciduous, label: "Jardin", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  general: { icon: Lightbulb, label: "General", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
};

const tierConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  free: { label: "", color: "", bgColor: "" },
  premium: { label: "Premium", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  enterprise: { label: "Destacado", color: "text-purple-700 dark:text-purple-300", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
};

export default function ProviderPage({ params }: ProviderPageProps) {
  const { slug } = use(params);

  const [quoteForm, setQuoteForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data: provider, isLoading, error } = trpc.marketplace.getProviderBySlug.useQuery(
    { slug },
    { retry: false }
  );

  const { data: reviewsData } = trpc.marketplace.getProviderReviews.useQuery(
    { providerId: provider?.id || "" },
    { enabled: !!provider?.id }
  );

  const requestQuoteMutation = trpc.marketplace.requestQuote.useMutation({
    onSuccess: () => {
      setSubmitSuccess(true);
      setIsSubmitting(false);
      setQuoteForm({ name: "", email: "", phone: "", message: "" });
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    setIsSubmitting(true);
    requestQuoteMutation.mutate({
      providerId: provider.id,
      category: (provider.services[0]?.category as "painting" | "renovation" | "electrical" | "plumbing" | "garden" | "general") || "general",
      title: `Solicitud desde perfil - ${provider.businessName}`,
      description: quoteForm.message,
      clientName: quoteForm.name,
      clientEmail: quoteForm.email,
      clientPhone: quoteForm.phone,
    });
  };

  if (error) {
    notFound();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-96 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    notFound();
  }

  const tier = tierConfig[provider.tier];
  const mainCategory = provider.services[0]?.category || "general";
  const catConfig = categoryConfig[mainCategory];
  const CategoryIcon = catConfig?.icon || Lightbulb;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);

  // Structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.businessName,
    description: provider.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: provider.address,
      addressLocality: provider.city,
      addressRegion: provider.province,
      addressCountry: "ES",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: provider.latitude,
      longitude: provider.longitude,
    },
    telephone: provider.contactPhone,
    email: provider.contactEmail,
    url: provider.website,
    image: provider.logoUrl,
    aggregateRating: provider.totalReviews > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: provider.averageRating.toFixed(1),
          reviewCount: provider.totalReviews,
          bestRating: 5,
        }
      : undefined,
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: provider.latitude,
        longitude: provider.longitude,
      },
      geoRadius: `${provider.coverageRadiusKm}000`,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/servicios"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a profesionales
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">{provider.businessName}</span>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {provider.logoUrl ? (
                    <img
                      src={provider.logoUrl}
                      alt={provider.businessName}
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CategoryIcon className="h-12 w-12 text-primary" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl font-bold">{provider.businessName}</h1>
                        {provider.isVerified && (
                          <BadgeCheck className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {[provider.address, provider.city, provider.province]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <span className="text-2xl font-bold">
                          {provider.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {provider.totalReviews} opiniones
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {tier.label && (
                      <Badge className={cn(tier.bgColor, tier.color)}>
                        {tier.label}
                      </Badge>
                    )}
                    {provider.isVerified && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        Verificado
                      </Badge>
                    )}
                    {provider.responseTimeMinutes && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Responde en{" "}
                        {provider.responseTimeMinutes < 60
                          ? `${provider.responseTimeMinutes}min`
                          : `${Math.round(provider.responseTimeMinutes / 60)}h`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {provider.description && (
                <p className="mt-4 text-muted-foreground">
                  {provider.description}
                </p>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="services">Servicios</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="reviews">
                  Opiniones ({reviewsData?.reviews?.length ?? 0})
                </TabsTrigger>
              </TabsList>

              {/* Services Tab */}
              <TabsContent value="services" className="mt-4">
                <div className="rounded-xl border bg-card divide-y">
                  {provider.services.length > 0 ? (
                    provider.services.map((service) => {
                      const sConfig = categoryConfig[service.category];
                      const ServiceIcon = sConfig?.icon || Lightbulb;

                      return (
                        <div key={service.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", sConfig?.bgColor)}>
                              <ServiceIcon className={cn("h-5 w-5", sConfig?.color)} />
                            </div>
                            <div>
                              <h3 className="font-medium">{service.title}</h3>
                              {service.description && (
                                <p className="text-sm text-muted-foreground">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {service.priceMin && (
                              <div>
                                <span className="font-semibold">
                                  {formatCurrency(service.priceMin)}
                                </span>
                                {service.priceMax && service.priceMax !== service.priceMin && (
                                  <span className="text-muted-foreground">
                                    {" - "}
                                    {formatCurrency(service.priceMax)}
                                  </span>
                                )}
                              </div>
                            )}
                            {service.priceUnit && (
                              <span className="text-xs text-muted-foreground">
                                / {service.priceUnit}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No hay servicios listados
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="mt-4">
                <div className="rounded-xl border bg-card p-6">
                  {provider.portfolio && provider.portfolio.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {provider.portfolio.map((item) => (
                        <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white text-sm font-medium">
                                {item.title}
                              </p>
                              {item.projectDate && (
                                <p className="text-white/70 text-xs flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(item.projectDate).toLocaleDateString("es-ES", {
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No hay proyectos en el portfolio</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-4">
                <div className="space-y-4">
                  {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                    reviewsData.reviews.map((review) => (
                      <div key={review.id} className="rounded-xl border bg-card p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {review.authorName || "Usuario"}
                              </span>
                              {review.isVerified && (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Verificado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "h-4 w-4",
                                    star <= review.rating
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-muted"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                        {review.title && (
                          <h4 className="font-medium mb-1">{review.title}</h4>
                        )}
                        {review.content && (
                          <p className="text-sm text-muted-foreground">
                            {review.content}
                          </p>
                        )}
                        {review.providerResponse && (
                          <div className="mt-3 pl-4 border-l-2 border-primary/20">
                            <p className="text-xs font-medium text-primary mb-1">
                              Respuesta del profesional
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {review.providerResponse}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                      No hay opiniones todavia
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Contact Card */}
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-semibold mb-4">Contactar</h2>

                <div className="space-y-3 mb-6">
                  {provider.contactPhone && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`tel:${provider.contactPhone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        {provider.contactPhone}
                      </a>
                    </Button>
                  )}
                  {provider.contactEmail && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`mailto:${provider.contactEmail}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        {provider.contactEmail}
                      </a>
                    </Button>
                  )}
                  {provider.website && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={provider.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        Web
                      </a>
                    </Button>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Solicitar presupuesto</h3>

                  {submitSuccess ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="font-medium">¡Solicitud enviada!</p>
                      <p className="text-sm text-muted-foreground">
                        Te contactaremos pronto
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitQuote} className="space-y-3">
                      <div>
                        <Label htmlFor="name" className="text-xs">Nombre *</Label>
                        <Input
                          id="name"
                          value={quoteForm.name}
                          onChange={(e) => setQuoteForm({ ...quoteForm, name: e.target.value })}
                          placeholder="Tu nombre"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-xs">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={quoteForm.email}
                          onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                          placeholder="tu@email.com"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-xs">Telefono</Label>
                        <Input
                          id="phone"
                          value={quoteForm.phone}
                          onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                          placeholder="+34 612 345 678"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message" className="text-xs">Mensaje</Label>
                        <Textarea
                          id="message"
                          value={quoteForm.message}
                          onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                          placeholder="Describe lo que necesitas..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting || !quoteForm.name || !quoteForm.email}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isSubmitting ? "Enviando..." : "Enviar solicitud"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Stats Card */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4">Estadisticas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{provider.totalLeads}</p>
                    <p className="text-xs text-muted-foreground">Proyectos</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{provider.totalReviews}</p>
                    <p className="text-xs text-muted-foreground">Opiniones</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{provider.coverageRadiusKm}km</p>
                    <p className="text-xs text-muted-foreground">Cobertura</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      {provider.averageRating.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">Valoracion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
