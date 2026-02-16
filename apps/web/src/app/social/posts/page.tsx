'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icons } from '@/components/ui/icons';
import { PostCard } from '@/components/social/PostCard';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

// ============================================
// PAGE
// ============================================

export default function SocialPostsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 12;

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch posts
  const { data: postsData, isLoading, refetch } = api.social.getPosts.useQuery({
    platform: platform === 'all' ? undefined : platform,
    status: status === 'all' ? undefined : status,
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const posts = postsData?.posts || [];
  const totalPages = Math.ceil((postsData?.total || 0) / limit);

  // Mutations
  const deletePostMutation = api.social.deletePost.useMutation();
  const retryPostMutation = api.social.publish.useMutation();

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePostMutation.mutateAsync({ postId });
      toast.success('Post eliminado');
      refetch();
    } catch (error) {
      toast.error('Error al eliminar', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo',
      });
    }
  };

  const handleRetryPost = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      await retryPostMutation.mutateAsync({
        listingId: post.listing?.id || '',
        platforms: [post.platform],
      });
      toast.success('Publicación reintentada');
      refetch();
    } catch (error) {
      toast.error('Error al reintentar', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo',
      });
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Publicaciones</h1>
          <p className="text-muted-foreground mt-1">
            Historial de publicaciones en redes sociales
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/social">
              <Icons.arrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href="/social/new">
              <Icons.plus className="mr-2 h-4 w-4" />
              Nueva
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar publicaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="scheduled">Programado</SelectItem>
            <SelectItem value="failed">Error</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <Icons.inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No hay publicaciones</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || platform !== 'all' || status !== 'all'
              ? 'No se encontraron publicaciones con estos filtros'
              : 'Comienza a publicar propiedades en tus redes sociales'}
          </p>
          {!searchQuery && platform === 'all' && status === 'all' && (
            <Button asChild>
              <Link href="/social/new">
                <Icons.plus className="mr-2 h-4 w-4" />
                Crear Publicación
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handleDeletePost}
                onRetry={handleRetryPost}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <Icons.chevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <Icons.chevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Bulk Actions */}
      {posts.filter((p) => p.status === 'failed').length > 0 && (
        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icons.alertTriangle className="h-5 w-5 text-yellow-500" />
              <span>
                {posts.filter((p) => p.status === 'failed').length} publicaciones con error
              </span>
            </div>
            <Button variant="outline" size="sm">
              <Icons.refresh className="mr-2 h-4 w-4" />
              Reintentar todos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
