'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/ui/icons';
import { PostCard } from '@/components/social/PostCard';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ============================================
// PAGE
// ============================================

export default function SocialDashboardPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const t = useTranslations("social");

  // Fetch data (retry: 1 to prevent hanging in demo mode without API)
  const { data: connectionsData } = api.social.getConnections.useQuery(undefined, { retry: 1 });
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = api.social.getPosts.useQuery({
    platform: selectedPlatform === 'all' ? undefined : selectedPlatform,
    limit: 12,
  }, { retry: 1 });
  const { data: analyticsData } = api.social.getAnalytics.useQuery({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
  }, { retry: 1 });

  const connections = connectionsData?.connections || [];
  const posts = postsData?.posts || [];
  const analytics = analyticsData?.analytics;

  // Mutations
  const deletePostMutation = api.social.deletePost.useMutation();

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePostMutation.mutateAsync({ postId });
      toast.success(t("postDeleted"));
      refetchPosts();
    } catch (error) {
      toast.error(t("deleteError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const activeConnections = connections.filter((c) => c.status === 'active');
  const platformStats = {
    facebook: posts.filter((p) => p.platform === 'facebook').length,
    instagram: posts.filter((p) => p.platform === 'instagram').length,
    linkedin: posts.filter((p) => p.platform === 'linkedin').length,
    tiktok: posts.filter((p) => p.platform === 'tiktok').length,
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/connections">
              <Icons.settings className="mr-2 h-4 w-4" />
              {t("connections")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/social/new">
              <Icons.plus className="mr-2 h-4 w-4" />
              {t("newPost")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("activeConnections")}</CardTitle>
            <Icons.link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeConnections.length}</div>
            <p className="text-xs text-muted-foreground">{t("ofPlatforms")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("postsThisMonth")}</CardTitle>
            <Icons.send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.length}</div>
            <p className="text-xs text-muted-foreground">{t("posts")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("impressions")}</CardTitle>
            <Icons.eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalImpressions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">{t("last30days")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("engagement")}</CardTitle>
            <Icons.heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalEngagement?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">{t("interactions")}</p>
          </CardContent>
        </Card>
      </div>

      {/* No Connections Warning */}
      {activeConnections.length === 0 && (
        <Card className="mb-8 border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.alertTriangle className="h-5 w-5 text-yellow-500" />
              {t("noConnections")}
            </CardTitle>
            <CardDescription>
              {t("noConnectionsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/connections">
                <Icons.plus className="mr-2 h-4 w-4" />
                {t("connectSocial")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Posts Section */}
      <Tabs defaultValue="all" className="space-y-4" onValueChange={setSelectedPlatform}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              {t("all")}
              <span className="ml-2 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
                {posts.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="facebook" disabled={platformStats.facebook === 0}>
              <Icons.facebook className="h-4 w-4 mr-1" />
              Facebook
              {platformStats.facebook > 0 && (
                <span className="ml-1 text-xs">{platformStats.facebook}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="instagram" disabled={platformStats.instagram === 0}>
              <Icons.instagram className="h-4 w-4 mr-1" />
              Instagram
              {platformStats.instagram > 0 && (
                <span className="ml-1 text-xs">{platformStats.instagram}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="linkedin" disabled={platformStats.linkedin === 0}>
              <Icons.linkedin className="h-4 w-4 mr-1" />
              LinkedIn
              {platformStats.linkedin > 0 && (
                <span className="ml-1 text-xs">{platformStats.linkedin}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tiktok" disabled={platformStats.tiktok === 0}>
              <Icons.tiktok className="h-4 w-4 mr-1" />
              TikTok
              {platformStats.tiktok > 0 && (
                <span className="ml-1 text-xs">{platformStats.tiktok}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/social/analytics">
                <Icons.barChart className="mr-2 h-4 w-4" />
                {t("viewAnalytics")}
              </Link>
            </Button>
          </div>
        </div>

        <TabsContent value={selectedPlatform} className="space-y-4">
          {postsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Icons.inbox className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">{t("noPosts")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("noPostsDesc")}
                </p>
                <Button asChild>
                  <Link href="/social/new">
                    <Icons.plus className="mr-2 h-4 w-4" />
                    {t("createPost")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Agent Info */}
      <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Icons.sparkles className="h-6 w-6 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{t("autoPostTitle")}</h3>
            <p className="text-muted-foreground mt-1">
              {t("autoPostDesc")}
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/automation">
                  <Icons.zap className="mr-2 h-4 w-4" />
                  {t("configAutomation")}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/docs/social-agents">
                  {t("moreInfo")}
                  <Icons.arrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
