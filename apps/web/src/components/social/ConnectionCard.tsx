'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// TYPES
// ============================================

interface SocialConnection {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
  status: 'active' | 'expired' | 'error' | 'pending';
  pageName?: string;
  pageId?: string;
  expiresAt?: Date;
  createdAt: Date;
  metadata?: {
    followers?: number;
    postsCount?: number;
  };
}

interface ConnectionCardProps {
  connection?: SocialConnection;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
  onConnect: (platform: string) => void;
  onDisconnect: (connectionId: string) => void;
  isConnecting?: boolean;
}

// ============================================
// PLATFORM CONFIG
// ============================================

const PLATFORM_CONFIG = {
  facebook: {
    name: 'Facebook',
    icon: 'facebook',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    description: 'Publica en tu página de Facebook automáticamente',
  },
  instagram: {
    name: 'Instagram',
    icon: 'instagram',
    color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
    hoverColor: 'hover:opacity-90',
    description: 'Comparte fotos y reels de propiedades',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'linkedin',
    color: 'bg-blue-700',
    hoverColor: 'hover:bg-blue-800',
    description: 'Publica contenido profesional inmobiliario',
  },
  tiktok: {
    name: 'TikTok',
    icon: 'tiktok',
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-900',
    description: 'Crea videos cortos de propiedades',
  },
} as const;

// ============================================
// COMPONENT
// ============================================

export function ConnectionCard({
  connection,
  platform,
  onConnect,
  onDisconnect,
  isConnecting = false,
}: ConnectionCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const config = PLATFORM_CONFIG[platform];
  const isConnected = connection?.status === 'active';
  const isExpired = connection?.status === 'expired';
  const hasError = connection?.status === 'error';

  const handleDisconnect = async () => {
    if (!connection) return;
    setIsDisconnecting(true);
    try {
      await onDisconnect(connection.id);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusBadge = () => {
    if (!connection) return null;

    switch (connection.status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return null;
    }
  };

  const PlatformIcon = () => {
    switch (platform) {
      case 'facebook':
        return <Icons.facebook className="h-6 w-6" />;
      case 'instagram':
        return <Icons.instagram className="h-6 w-6" />;
      case 'linkedin':
        return <Icons.linkedin className="h-6 w-6" />;
      case 'tiktok':
        return <Icons.tiktok className="h-6 w-6" />;
      default:
        return <Icons.globe className="h-6 w-6" />;
    }
  };

  return (
    <Card className={`relative overflow-hidden ${isConnected ? 'border-green-500/50' : ''}`}>
      {/* Platform Color Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.color} text-white`}>
            <PlatformIcon />
          </div>
          <div>
            <CardTitle className="text-lg">{config.name}</CardTitle>
            {connection?.pageName && (
              <p className="text-sm text-muted-foreground">{connection.pageName}</p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </CardHeader>

      <CardContent>
        <CardDescription className="mb-4">{config.description}</CardDescription>

        {isConnected && connection && (
          <div className="space-y-2 mb-4 text-sm">
            {connection.metadata?.followers && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seguidores</span>
                <span className="font-medium">{connection.metadata.followers.toLocaleString()}</span>
              </div>
            )}
            {connection.metadata?.postsCount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posts publicados</span>
                <span className="font-medium">{connection.metadata.postsCount}</span>
              </div>
            )}
            {connection.expiresAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expira</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(connection.expiresAt), { locale: es, addSuffix: true })}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conectado</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(connection.createdAt), { locale: es, addSuffix: true })}
              </span>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Tu conexión ha expirado. Reconecta para seguir publicando.
            </p>
          </div>
        )}

        {hasError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              Error de conexión. Intenta reconectar.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected || isExpired || hasError ? (
            <Button
              onClick={() => onConnect(platform)}
              disabled={isConnecting}
              className={`flex-1 ${config.color} ${config.hoverColor} text-white`}
            >
              {isConnecting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : isExpired || hasError ? (
                <>
                  <Icons.refresh className="mr-2 h-4 w-4" />
                  Reconectar
                </>
              ) : (
                <>
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Conectar
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={() => onConnect(platform)}>
                <Icons.settings className="mr-2 h-4 w-4" />
                Configurar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isDisconnecting ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.trash className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
