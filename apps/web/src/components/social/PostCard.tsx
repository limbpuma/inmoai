'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================

interface SocialPost {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
  status: 'published' | 'scheduled' | 'failed' | 'draft';
  content: string;
  hashtags?: string[];
  mediaUrls?: string[];
  postUrl?: string;
  scheduledAt?: Date;
  publishedAt?: Date;
  analytics?: {
    impressions?: number;
    engagement?: number;
    clicks?: number;
    shares?: number;
    comments?: number;
    likes?: number;
  };
  listing?: {
    id: string;
    title: string;
    imageUrl?: string;
  };
  errorMessage?: string;
}

interface PostCardProps {
  post: SocialPost;
  onDelete?: (postId: string) => void;
  onRetry?: (postId: string) => void;
  onEdit?: (postId: string) => void;
}

// ============================================
// PLATFORM CONFIG
// ============================================

const PLATFORM_ICONS = {
  facebook: Icons.facebook,
  instagram: Icons.instagram,
  linkedin: Icons.linkedin,
  tiktok: Icons.tiktok,
};

const PLATFORM_COLORS = {
  facebook: 'text-blue-600',
  instagram: 'text-pink-500',
  linkedin: 'text-blue-700',
  tiktok: 'text-black dark:text-white',
};

// ============================================
// COMPONENT
// ============================================

export function PostCard({ post, onDelete, onRetry, onEdit }: PostCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const PlatformIcon = PLATFORM_ICONS[post.platform];
  const platformColor = PLATFORM_COLORS[post.platform];

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(post.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry(post.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = () => {
    switch (post.status) {
      case 'published':
        return <Badge variant="default" className="bg-green-500">Publicado</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Programado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Error</Badge>;
      case 'draft':
        return <Badge variant="outline">Borrador</Badge>;
      default:
        return null;
    }
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon className={`h-5 w-5 ${platformColor}`} />
          <span className="text-sm font-medium capitalize">{post.platform}</span>
          {getStatusBadge()}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Icons.moreVertical className="h-4 w-4" />
              <span className="sr-only">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {post.postUrl && (
              <DropdownMenuItem asChild>
                <a href={post.postUrl} target="_blank" rel="noopener noreferrer">
                  <Icons.externalLink className="mr-2 h-4 w-4" />
                  Ver en {post.platform}
                </a>
              </DropdownMenuItem>
            )}
            {post.status === 'draft' && onEdit && (
              <DropdownMenuItem onClick={() => onEdit(post.id)}>
                <Icons.edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            {post.status === 'failed' && onRetry && (
              <DropdownMenuItem onClick={handleRetry} disabled={isRetrying}>
                <Icons.refresh className="mr-2 h-4 w-4" />
                Reintentar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onDelete && (
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Icons.trash className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Media Preview */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <Image
              src={post.mediaUrls[0]}
              alt="Post media"
              fill
              className="object-cover"
            />
            {post.mediaUrls.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                +{post.mediaUrls.length - 1}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <p className="text-sm line-clamp-3">{post.content}</p>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 5).map((tag) => (
              <span key={tag} className="text-xs text-blue-500">
                #{tag}
              </span>
            ))}
            {post.hashtags.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{post.hashtags.length - 5} más
              </span>
            )}
          </div>
        )}

        {/* Error Message */}
        {post.status === 'failed' && post.errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{post.errorMessage}</p>
          </div>
        )}

        {/* Listing Reference */}
        {post.listing && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            {post.listing.imageUrl && (
              <Image
                src={post.listing.imageUrl}
                alt={post.listing.title}
                width={40}
                height={40}
                className="rounded object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{post.listing.title}</p>
              <p className="text-xs text-muted-foreground">Propiedad vinculada</p>
            </div>
          </div>
        )}

        {/* Analytics */}
        {post.status === 'published' && post.analytics && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t">
            <div className="text-center">
              <p className="text-lg font-semibold">{formatNumber(post.analytics.impressions)}</p>
              <p className="text-xs text-muted-foreground">Vistas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{formatNumber(post.analytics.likes)}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{formatNumber(post.analytics.comments)}</p>
              <p className="text-xs text-muted-foreground">Comentarios</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{formatNumber(post.analytics.shares)}</p>
              <p className="text-xs text-muted-foreground">Compartidos</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <p className="text-xs text-muted-foreground">
          {post.status === 'scheduled' && post.scheduledAt ? (
            <>Programado para {format(new Date(post.scheduledAt), "d 'de' MMMM 'a las' HH:mm", { locale: es })}</>
          ) : post.publishedAt ? (
            <>Publicado {formatDistanceToNow(new Date(post.publishedAt), { locale: es, addSuffix: true })}</>
          ) : null}
        </p>
      </CardFooter>
    </Card>
  );
}
