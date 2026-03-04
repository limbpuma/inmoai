'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

const PLATFORMS: SocialPlatform[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Icons.facebook,
    color: 'bg-blue-600',
    description: 'Publica en tu página de Facebook',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Icons.instagram,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Comparte en tu perfil de Instagram',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Icons.linkedin,
    color: 'bg-blue-700',
    description: 'Alcanza profesionales en LinkedIn',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Icons.tiktok,
    color: 'bg-black',
    description: 'Crea videos virales de propiedades',
  },
];

// ============================================
// PAGE
// ============================================

export default function SocialConnectPage() {
  const router = useRouter();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: connectionsData, isLoading } = api.social.getConnections.useQuery();
  const completeStage = api.onboarding.completeStage.useMutation();
  const skipStage = api.onboarding.skipStage.useMutation();

  const connections = connectionsData?.connections || [];
  const connectedPlatforms = connections
    .filter((c) => c.status === 'active')
    .map((c) => c.platform);

  const hasAnyConnection = connectedPlatforms.length > 0;

  const handleConnect = async (platformId: string) => {
    setConnectingPlatform(platformId);

    try {
      // Redirect to OAuth flow
      window.location.href = `/api/auth/${platformId}/connect?redirect=/onboarding/social-connect`;
    } catch (error) {
      toast.error('Error al conectar');
      setConnectingPlatform(null);
    }
  };

  const handleContinue = async () => {
    try {
      await completeStage.mutateAsync({ stage: 'social_connect' });
      await utils.onboarding.invalidate();
      toast.success('¡Onboarding completado!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Error al completar');
    }
  };

  const handleSkip = async () => {
    try {
      await skipStage.mutateAsync({ stage: 'social_connect' });
      await utils.onboarding.invalidate();
      toast.info('Puedes conectar redes sociales más tarde');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Error al continuar');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Conecta tus redes sociales</h1>
        <p className="text-muted-foreground">
          Publica automáticamente tus propiedades en múltiples plataformas
        </p>
      </div>

      {/* Benefits */}
      <Card className="bg-purple-500/5 border-purple-500/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Icons.sparkles className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold">Publicación automática con IA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Nuestros agentes IA generan contenido optimizado para cada plataforma
              y publican automáticamente cuando creas una propiedad.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const isConnected = connectedPlatforms.includes(platform.id);
          const isConnecting = connectingPlatform === platform.id;
          const IconComponent = platform.icon;

          return (
            <Card
              key={platform.id}
              className={cn(
                'transition-all duration-200',
                isConnected && 'border-green-500 bg-green-500/5'
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={cn('p-3 rounded-lg text-white', platform.color)}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{platform.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {platform.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  {isConnected ? (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-green-600">
                        <Icons.checkCircle className="h-4 w-4" />
                        Conectado
                      </span>
                      <Button variant="ghost" size="sm">
                        Desconectar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleConnect(platform.id)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <>
                          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Icons.link className="mr-2 h-4 w-4" />
                          Conectar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connection Status */}
      {hasAnyConnection && (
        <Card className="border-green-500 bg-green-500/5">
          <CardContent className="flex items-center gap-4 py-4">
            <Icons.checkCircle className="h-6 w-6 text-green-500" />
            <div className="flex-1">
              <p className="font-medium">
                {connectedPlatforms.length} red(es) conectada(s)
              </p>
              <p className="text-sm text-muted-foreground">
                Tus propiedades se publicarán automáticamente
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>

        {hasAnyConnection ? (
          <Button className="flex-1" onClick={handleContinue}>
            Completar Onboarding
            <Icons.check className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" className="flex-1" onClick={handleSkip}>
            Saltar por ahora
            <Icons.arrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Note */}
      <p className="text-center text-sm text-muted-foreground">
        Puedes conectar o desconectar redes sociales en cualquier momento
        desde la configuración de tu cuenta.
      </p>
    </div>
  );
}
