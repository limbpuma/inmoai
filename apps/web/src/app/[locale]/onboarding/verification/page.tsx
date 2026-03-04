'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ============================================
// PAGE
// ============================================

export default function VerificationPage() {
  const router = useRouter();
  const [cadastreRef, setCadastreRef] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  } | null>(null);

  const utils = api.useUtils();
  const verifyCadastre = api.cadastre.verify.useMutation();
  const completeStage = api.onboarding.completeStage.useMutation();

  const handleVerify = async () => {
    if (!cadastreRef.trim()) {
      toast.error('Introduce la referencia catastral');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await verifyCadastre.mutateAsync({
        cadastreReference: cadastreRef.trim(),
      });

      setVerificationResult({
        success: true,
        data: result,
      });

      // Complete onboarding stage
      await completeStage.mutateAsync({
        stage: 'verification',
        data: { cadastreReference: cadastreRef },
      });

      await utils.onboarding.invalidate();
      toast.success('Verificación completada');

    } catch (error) {
      setVerificationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error de verificación',
      });
      toast.error('Error al verificar');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/social-connect');
  };

  const handleSkip = async () => {
    try {
      await completeStage.mutateAsync({ stage: 'verification' });
      await utils.onboarding.invalidate();
      router.push('/onboarding/social-connect');
    } catch (error) {
      toast.error('Error al continuar');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Verificación Catastral</h1>
        <p className="text-muted-foreground">
          Verifica los datos de tu propiedad con el Catastro oficial
        </p>
      </div>

      {/* Why Verify */}
      <Card className="bg-green-500/5 border-green-500/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Icons.shieldCheck className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold">¿Por qué verificar?</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Mayor confianza de los compradores</li>
              <li>• Datos oficiales del Catastro español</li>
              <li>• Detecta discrepancias antes de vender</li>
              <li>• Distintivo de propiedad verificada</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Referencia Catastral</CardTitle>
          <CardDescription>
            Introduce la referencia catastral de tu propiedad (20 caracteres)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cadastre">Referencia Catastral</Label>
            <Input
              id="cadastre"
              placeholder="Ej: 9872023VH5797S0001WX"
              value={cadastreRef}
              onChange={(e) => setCadastreRef(e.target.value.toUpperCase())}
              maxLength={20}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              La encuentras en tu recibo del IBI o en{' '}
              <a
                href="https://www.sedecatastro.gob.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                sedecatastro.gob.es
              </a>
            </p>
          </div>

          <Button
            onClick={handleVerify}
            disabled={isVerifying || cadastreRef.length < 14}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Verificando con Catastro...
              </>
            ) : (
              <>
                <Icons.search className="mr-2 h-4 w-4" />
                Verificar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {verificationResult && (
        <Card className={verificationResult.success ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verificationResult.success ? (
                <>
                  <Icons.checkCircle className="h-5 w-5 text-green-500" />
                  Verificación Exitosa
                </>
              ) : (
                <>
                  <Icons.xCircle className="h-5 w-5 text-red-500" />
                  Error de Verificación
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verificationResult.success && verificationResult.data ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dirección:</span>
                  <span className="font-medium">
                    {(verificationResult.data as Record<string, string>).address || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Superficie:</span>
                  <span className="font-medium">
                    {(verificationResult.data as Record<string, number>).surface || 'N/A'} m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uso:</span>
                  <span className="font-medium">
                    {(verificationResult.data as Record<string, string>).use || 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600">
                {verificationResult.error || 'No se pudo verificar la referencia catastral'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        {verificationResult?.success ? (
          <Button className="flex-1" onClick={handleContinue}>
            Continuar
            <Icons.arrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" className="flex-1" onClick={handleSkip}>
            Saltar por ahora
            <Icons.arrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
