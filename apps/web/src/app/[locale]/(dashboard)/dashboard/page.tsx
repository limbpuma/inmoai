"use client";

import { useSession } from "next-auth/react";
import { useBilling } from "@/hooks/useBilling";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  Search,
  Heart,
  Bell,
  TrendingUp,
  Crown,
  ArrowRight,
  MapPin,
  Home,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { isPro, isAgency, hasActiveSubscription, isLoadingSubscription } = useBilling();
  const t = useTranslations("dashboard");

  const maxSearches = isPro || isAgency ? t("unlimited") : "10";
  const maxAlerts = isPro || isAgency ? t("unlimited") : "3";

  const recentSearches = [
    { id: 1, query: "Piso 3 habitaciones Barcelona", date: "2h", results: 24 },
    { id: 2, query: "Casa con jardin Madrid norte", date: "5h", results: 8 },
    { id: 3, query: "Atico luminoso Valencia", date: "1d", results: 15 },
  ];

  const savedProperties = [
    { id: 1, title: "Piso en Eixample", price: "385.000€", location: "Barcelona" },
    { id: 2, title: "Casa adosada", price: "520.000€", location: "Madrid" },
    { id: 3, title: "Atico con terraza", price: "295.000€", location: "Valencia" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {t("hello", { name: session?.user?.name || "Usuario" })}
          </h1>
          <p className="text-muted-foreground">{t("welcome")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoadingSubscription ? (
            <Skeleton className="h-6 w-20" />
          ) : hasActiveSubscription ? (
            <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500">
              <Crown className="h-3 w-3 mr-1" />
              {isAgency ? "Agency" : "Pro"}
            </Badge>
          ) : (
            <Link href="/pricing">
              <Button size="sm" variant="outline">
                <Crown className="h-3 w-3 mr-1" />
                {t("upgradePro")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("searchesToday")}</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              {t("of", { count: maxSearches })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("savedProperties")}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">{t("inFavorites")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("activeAlerts")}</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isPro || isAgency ? 8 : 3}</div>
            <p className="text-xs text-muted-foreground">
              {t("of", { count: maxAlerts })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("avgScore")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">87%</div>
            <p className="text-xs text-muted-foreground">{t("authenticityFavorites")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Searches */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("recentSearches")}</CardTitle>
              <Link href="/dashboard/history">
                <Button variant="ghost" size="sm">
                  {t("viewAll")}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>{t("recentSearchesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Search className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{search.query}</p>
                      <p className="text-xs text-muted-foreground">{search.date}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{t("results", { count: search.results })}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Saved Properties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("savedPropertiesTitle")}</CardTitle>
              <Link href="/dashboard/favorites">
                <Button variant="ghost" size="sm">
                  {t("viewAll")}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>{t("yourFavorites")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {savedProperties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{property.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {property.location}
                      </div>
                    </div>
                  </div>
                  <span className="font-semibold text-primary">{property.price}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade CTA for free users */}
      {!hasActiveSubscription && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{t("unlockTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("unlockDesc")}</p>
              </div>
            </div>
            <Link href="/pricing">
              <Button>
                {t("viewPlans")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
