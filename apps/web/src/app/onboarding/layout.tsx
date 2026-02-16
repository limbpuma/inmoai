'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Icons } from '@/components/ui/icons';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: progressData, isLoading } = api.onboarding.getProgress.useQuery();

  useEffect(() => {
    // Redirect to dashboard if onboarding is complete
    if (progressData?.progress.isCompleted) {
      router.push('/dashboard');
    }
  }, [progressData, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressData?.progress.percentage || 0}%` }}
        />
      </div>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.home className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">InmoAI</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {progressData?.progress.percentage || 0}% completado
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-2xl py-12">
        {children}
      </main>
    </div>
  );
}
