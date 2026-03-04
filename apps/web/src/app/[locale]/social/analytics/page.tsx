'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icons } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// TYPES
// ============================================

type DateRange = '7d' | '30d' | '90d';

// ============================================
// PAGE
// ============================================

export default function SocialAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [platform, setPlatform] = useState<string>('all');

  const getDays = (range: DateRange) => {
    switch (range) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
    }
  };

  const days = getDays(dateRange);
  const fromDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
  const toDate = format(new Date(), 'yyyy-MM-dd');

  // Fetch analytics
  const { data: analyticsData, isLoading } = api.social.getAnalytics.useQuery({
    platform: platform === 'all' ? undefined : platform,
    dateRange: { from: fromDate, to: toDate },
  });

  const analytics = analyticsData?.analytics;
  const dailyData = analyticsData?.dailyData || [];

  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Get platform comparison data
  const platformComparison = analyticsData?.platformComparison || [];

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Rendimiento de tus publicaciones en redes sociales
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/social">
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-8">
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="90d">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>

        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las plataformas</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impresiones</CardTitle>
                <Icons.eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totalImpressions?.toLocaleString() || '0'}
                </div>
                {analytics?.impressionsTrend && (
                  <p className={`text-xs ${analytics.impressionsTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {analytics.impressionsTrend >= 0 ? '+' : ''}{analytics.impressionsTrend.toFixed(1)}% vs período anterior
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                <Icons.heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totalEngagement?.toLocaleString() || '0'}
                </div>
                {analytics?.engagementRate && (
                  <p className="text-xs text-muted-foreground">
                    {analytics.engagementRate.toFixed(2)}% tasa de engagement
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clics</CardTitle>
                <Icons.mousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totalClicks?.toLocaleString() || '0'}
                </div>
                {analytics?.ctr && (
                  <p className="text-xs text-muted-foreground">
                    {analytics.ctr.toFixed(2)}% CTR
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Publicaciones</CardTitle>
                <Icons.send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalPosts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  en {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} días
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Desglose de Engagement</CardTitle>
                <CardDescription>Interacciones por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.heart className="h-4 w-4 text-red-500" />
                      <span>Likes</span>
                    </div>
                    <span className="font-medium">{analytics?.likes?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.messageCircle className="h-4 w-4 text-blue-500" />
                      <span>Comentarios</span>
                    </div>
                    <span className="font-medium">{analytics?.comments?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.share className="h-4 w-4 text-green-500" />
                      <span>Compartidos</span>
                    </div>
                    <span className="font-medium">{analytics?.shares?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.bookmark className="h-4 w-4 text-purple-500" />
                      <span>Guardados</span>
                    </div>
                    <span className="font-medium">{analytics?.saves?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Plataforma</CardTitle>
                <CardDescription>Comparación de métricas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platformComparison.length > 0 ? (
                    platformComparison.map((p) => (
                      <div key={p.platform} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {p.platform === 'facebook' && <Icons.facebook className="h-4 w-4 text-blue-600" />}
                            {p.platform === 'instagram' && <Icons.instagram className="h-4 w-4 text-pink-500" />}
                            {p.platform === 'linkedin' && <Icons.linkedin className="h-4 w-4 text-blue-700" />}
                            {p.platform === 'tiktok' && <Icons.tiktok className="h-4 w-4" />}
                            <span className="capitalize">{p.platform}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {p.engagementRate?.toFixed(2)}% engagement
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(p.engagementRate * 10, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No hay datos de comparación disponibles
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Mejores Publicaciones</CardTitle>
              <CardDescription>Posts con mayor engagement</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.topPosts && analytics.topPosts.length > 0 ? (
                <div className="space-y-4">
                  {analytics.topPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-muted-foreground w-8">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{post.content}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="capitalize">{post.platform}</span>
                          <span>{format(new Date(post.publishedAt), "d MMM", { locale: es })}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{post.engagement?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">interacciones</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Icons.barChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos de publicaciones disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Icons.lightbulb className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Insights IA</h3>
                <p className="text-muted-foreground mt-1">
                  {analytics?.aiInsight || 'Publica más contenido para recibir insights personalizados basados en el rendimiento de tus publicaciones.'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
