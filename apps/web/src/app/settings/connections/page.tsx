'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { ConnectionCard } from '@/components/social/ConnectionCard';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';

interface SocialConnection {
  id: string;
  platform: Platform;
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

// ============================================
// PAGE
// ============================================

export default function ConnectionsPage() {
  const router = useRouter();
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);

  // Fetch connections
  const { data: connectionsData, isLoading, refetch } = api.social.getConnections.useQuery();
  const connections = connectionsData?.connections || [];

  // Mutations
  const getAuthUrlMutation = api.social.getAuthUrl.useMutation();
  const disconnectMutation = api.social.disconnect.useMutation();

  const handleConnect = async (platform: Platform) => {
    try {
      setConnectingPlatform(platform);

      const { authUrl } = await getAuthUrlMutation.mutateAsync({
        platform,
        redirectUri: `${window.location.origin}/api/auth/${platform}/callback`,
      });

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        `Connect ${platform}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      // Listen for popup close
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setConnectingPlatform(null);
          refetch();
        }
      }, 500);
    } catch (error) {
      toast.error('Error al conectar', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo',
      });
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await disconnectMutation.mutateAsync({ connectionId });
      toast.success('Desconectado correctamente');
      refetch();
    } catch (error) {
      toast.error('Error al desconectar', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo',
      });
    }
  };

  const getConnectionForPlatform = (platform: Platform): SocialConnection | undefined => {
    return connections.find((c) => c.platform === platform);
  };

  const platforms: Platform[] = ['facebook', 'instagram', 'linkedin', 'tiktok'];

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Conexiones Sociales</h1>
          <p className="text-muted-foreground mt-1">
            Conecta tus redes sociales para publicar propiedades automáticamente
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8">
        <div className="flex gap-3">
          <Icons.info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-700 dark:text-blue-400">
              Autoposting con IA
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando conectes tus redes sociales, nuestros agentes IA podrán generar y publicar
              contenido optimizado para cada plataforma automáticamente. El contenido incluye
              descripciones atractivas, hashtags relevantes y formatos específicos para cada red.
            </p>
          </div>
        </div>
      </div>

      {/* Connections Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <ConnectionCard
              key={platform}
              platform={platform}
              connection={getConnectionForPlatform(platform)}
              onConnect={() => handleConnect(platform)}
              onDisconnect={handleDisconnect}
              isConnecting={connectingPlatform === platform}
            />
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {connections.length > 0 && (
        <div className="mt-8 p-6 bg-muted/50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Resumen</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">
                {connections.filter((c) => c.status === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Activas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">
                {connections.filter((c) => c.status === 'expired').length}
              </p>
              <p className="text-sm text-muted-foreground">Expiradas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">
                {connections.reduce((acc, c) => acc + (c.metadata?.postsCount || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Posts totales</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-500">
                {connections.reduce((acc, c) => acc + (c.metadata?.followers || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Alcance total</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Preguntas frecuentes</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">¿Por qué necesito conectar una página de empresa?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Facebook e Instagram requieren una página de empresa para publicar mediante API.
              Si solo tienes perfil personal, deberás crear una página de Facebook primero.
            </p>
          </div>
          <div>
            <h3 className="font-medium">¿Qué permisos se solicitan?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Solicitamos permisos mínimos necesarios: publicar contenido y ver analytics de tus posts.
              Nunca accedemos a mensajes privados ni información personal.
            </p>
          </div>
          <div>
            <h3 className="font-medium">¿Puedo revocar el acceso en cualquier momento?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sí, puedes desconectar cualquier red social desde esta página o directamente desde
              la configuración de aplicaciones de cada plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
