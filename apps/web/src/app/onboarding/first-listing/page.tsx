'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ============================================
// PAGE
// ============================================

export default function FirstListingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const utils = api.useUtils();
  const { data: stepsData } = api.onboarding.getSteps.useQuery();
  const completeStage = api.onboarding.completeStage.useMutation();

  const currentStep = stepsData?.steps.find((s) => s.stage === 'first_listing');
  const listingCreated = currentStep?.requirements.find((r) => r.id === 'listing_created')?.completed;
  const imagesUploaded = currentStep?.requirements.find((r) => r.id === 'images_uploaded')?.completed;

  const handleCheckProgress = async () => {
    setIsChecking(true);
    try {
      await utils.onboarding.getSteps.invalidate();

      // Check if both requirements are met
      const updatedSteps = await utils.onboarding.getSteps.fetch();
      const step = updatedSteps?.steps.find((s) => s.stage === 'first_listing');
      const allComplete = step?.requirements.every((r) => r.completed);

      if (allComplete) {
        await completeStage.mutateAsync({ stage: 'first_listing' });
        toast.success('¡Primer inmueble publicado!');
        router.push('/onboarding/verification');
      } else {
        toast.info('Aún falta completar algunos requisitos');
      }
    } catch (error) {
      toast.error('Error al verificar progreso');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Publica tu primer inmueble</h1>
        <p className="text-muted-foreground">
          Añade una propiedad para empezar a recibir interesados
        </p>
      </div>

      {/* Requirements Status */}
      <Card>
        <CardHeader>
          <CardTitle>Requisitos</CardTitle>
          <CardDescription>
            Completa estos pasos para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            {listingCreated ? (
              <Icons.checkCircle className="h-6 w-6 text-green-500" />
            ) : (
              <Icons.circle className="h-6 w-6 text-muted-foreground" />
            )}
            <div className="flex-1">
              <p className="font-medium">Crear inmueble</p>
              <p className="text-sm text-muted-foreground">
                Añade los datos básicos de tu propiedad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            {imagesUploaded ? (
              <Icons.checkCircle className="h-6 w-6 text-green-500" />
            ) : (
              <Icons.circle className="h-6 w-6 text-muted-foreground" />
            )}
            <div className="flex-1">
              <p className="font-medium">Añadir fotos</p>
              <p className="text-sm text-muted-foreground">
                Sube al menos 4 fotos de calidad
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Card */}
      <Card className="border-primary">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Icons.home className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {listingCreated ? 'Editar mi inmueble' : 'Crear mi primer inmueble'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {listingCreated
                  ? 'Completa la información y añade más fotos'
                  : 'Solo te llevará unos minutos'}
              </p>
            </div>
            <Button asChild size="lg" className="w-full">
              <Link href="/listings/new">
                {listingCreated ? (
                  <>
                    <Icons.edit className="mr-2 h-4 w-4" />
                    Editar Inmueble
                  </>
                ) : (
                  <>
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Crear Inmueble
                  </>
                )}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.lightbulb className="h-5 w-5 text-blue-500" />
            Consejos para vender más rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Icons.check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Usa fotos con buena iluminación natural</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Incluye todas las habitaciones y espacios exteriores</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Escribe una descripción detallada con características clave</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Indica la ubicación exacta para mejor visibilidad</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          className="flex-1"
          onClick={handleCheckProgress}
          disabled={isChecking || (!listingCreated && !imagesUploaded)}
        >
          {isChecking ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              Verificar y Continuar
              <Icons.arrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
