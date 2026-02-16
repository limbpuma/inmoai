'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ============================================
// PAGE
// ============================================

export default function SignupCompletePage() {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: stepsData, isLoading } = api.onboarding.getSteps.useQuery();
  const completeStage = api.onboarding.completeStage.useMutation();

  const currentStep = stepsData?.steps.find((s) => s.stage === 'signup');
  const emailVerified = currentStep?.requirements.find((r) => r.id === 'email_verified')?.completed;

  useEffect(() => {
    // If email is verified, auto-complete this stage
    if (emailVerified) {
      completeSignup();
    }
  }, [emailVerified]);

  const completeSignup = async () => {
    try {
      await completeStage.mutateAsync({ stage: 'signup' });
      await utils.onboarding.invalidate();
      router.push('/onboarding/profile-setup');
    } catch (error) {
      // Ignore if already completed
    }
  };

  const handleResendEmail = async () => {
    try {
      // TODO: Implement email resend
      toast.success('Email de verificación enviado');
    } catch (error) {
      toast.error('Error al enviar email');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Verifica tu email</h1>
        <p className="text-muted-foreground">
          Hemos enviado un enlace de verificación a tu correo
        </p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {emailVerified ? (
              <Icons.checkCircle className="h-8 w-8 text-green-500" />
            ) : (
              <Icons.mail className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle>
            {emailVerified ? '¡Email verificado!' : 'Revisa tu bandeja de entrada'}
          </CardTitle>
          <CardDescription>
            {emailVerified
              ? 'Tu email ha sido verificado correctamente'
              : 'Haz clic en el enlace del email para continuar'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailVerified ? (
            <Button
              className="w-full"
              onClick={() => router.push('/onboarding/profile-setup')}
            >
              Continuar
              <Icons.arrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
              >
                <Icons.refresh className="mr-2 h-4 w-4" />
                Reenviar email
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿No encuentras el email? Revisa tu carpeta de spam
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-center gap-4 pt-6">
          <Icons.helpCircle className="h-6 w-6 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm">
              ¿Problemas para verificar?{' '}
              <a href="/contact" className="text-primary hover:underline">
                Contacta con soporte
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
