'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ============================================
// ICON MAPPING
// ============================================

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'user-plus': Icons.userPlus,
  'user-cog': Icons.settings,
  'home': Icons.home,
  'shield-check': Icons.shieldCheck,
  'share-2': Icons.share,
  'check-circle': Icons.checkCircle,
};

// ============================================
// PAGE
// ============================================

export default function OnboardingPage() {
  const router = useRouter();

  const { data: stepsData, isLoading } = api.onboarding.getSteps.useQuery();
  const { data: progressData } = api.onboarding.getProgress.useQuery();

  const steps = stepsData?.steps || [];
  const currentStep = steps.find((s) => s.isCurrent);

  useEffect(() => {
    // Redirect to current stage page
    if (currentStep && currentStep.stage !== 'completed') {
      router.push(`/onboarding/${currentStep.stage.replace('_', '-')}`);
    } else if (currentStep?.stage === 'completed') {
      router.push('/dashboard');
    }
  }, [currentStep, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Bienvenido a InmoAI</h1>
        <p className="text-xl text-muted-foreground">
          Configura tu cuenta en unos minutos y comienza a vender
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Tu Progreso</CardTitle>
          <CardDescription>
            {progressData?.progress.percentage || 0}% completado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressData?.progress.percentage || 0} className="h-2" />
        </CardContent>
      </Card>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const IconComponent = STAGE_ICONS[step.icon] || Icons.circle;
          const isAccessible = step.isCompleted || step.isCurrent;

          return (
            <Card
              key={step.stage}
              className={cn(
                'transition-all duration-200',
                step.isCurrent && 'border-primary shadow-md',
                step.isCompleted && 'bg-muted/50',
                !isAccessible && 'opacity-50'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      step.isCompleted && 'bg-green-500 text-white',
                      step.isCurrent && 'bg-primary text-primary-foreground',
                      !step.isCompleted && !step.isCurrent && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {step.isCompleted ? (
                      <Icons.check className="h-5 w-5" />
                    ) : (
                      <IconComponent className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{step.name}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                  {step.isCurrent && (
                    <Button
                      onClick={() => router.push(`/onboarding/${step.stage.replace('_', '-')}`)}
                    >
                      Continuar
                      <Icons.arrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {step.isCompleted && (
                    <Icons.checkCircle className="h-6 w-6 text-green-500" />
                  )}
                </div>
              </CardHeader>

              {step.isCurrent && step.requirements.length > 0 && (
                <CardContent>
                  <div className="ml-14 space-y-2">
                    {step.requirements.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        {req.completed ? (
                          <Icons.checkCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Icons.circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={cn(req.completed && 'text-muted-foreground line-through')}>
                          {req.label}
                        </span>
                        {req.optional && (
                          <span className="text-xs text-muted-foreground">(opcional)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Icons.helpCircle className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium">¿Necesitas ayuda?</p>
            <p className="text-sm text-muted-foreground">
              Nuestro equipo está disponible para asistirte en cada paso
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Icons.messageCircle className="mr-2 h-4 w-4" />
            Contactar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
