'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icons } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ============================================
// SCHEMA
// ============================================

const profileSchema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().min(9, 'Teléfono inválido'),
  role: z.enum(['seller', 'agent', 'agency'], {
    required_error: 'Selecciona un tipo de usuario',
  }),
  company: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ============================================
// PAGE
// ============================================

export default function ProfileSetupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();
  const updateUserMutation = api.users.updateProfile.useMutation();
  const completeStage = api.onboarding.completeStage.useMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      // Update user profile
      await updateUserMutation.mutateAsync({
        name: data.name,
        metadata: {
          phone: data.phone,
          company: data.company,
        },
      });

      // Complete onboarding stage
      await completeStage.mutateAsync({
        stage: 'profile_setup',
        data: {
          role: data.role,
          phone: data.phone,
        },
      });

      await utils.onboarding.invalidate();
      toast.success('Perfil actualizado');
      router.push('/onboarding/first-listing');
    } catch (error) {
      toast.error('Error al guardar', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Completa tu perfil</h1>
        <p className="text-muted-foreground">
          Cuéntanos más sobre ti para personalizar tu experiencia
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
          <CardDescription>
            Estos datos serán visibles para los interesados en tus propiedades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                placeholder="Tu nombre"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+34 600 000 000"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Tipo de usuario *</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setValue('role', value as ProfileFormData['role'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller">
                    <div className="flex items-center gap-2">
                      <Icons.user className="h-4 w-4" />
                      <span>Particular</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="agent">
                    <div className="flex items-center gap-2">
                      <Icons.briefcase className="h-4 w-4" />
                      <span>Agente inmobiliario</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="agency">
                    <div className="flex items-center gap-2">
                      <Icons.building className="h-4 w-4" />
                      <span>Agencia inmobiliaria</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>

            {/* Company (for agents/agencies) */}
            {(selectedRole === 'agent' || selectedRole === 'agency') && (
              <div className="space-y-2">
                <Label htmlFor="company">Nombre de la empresa</Label>
                <Input
                  id="company"
                  placeholder="Tu empresa o agencia"
                  {...register('company')}
                />
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                <Icons.arrowLeft className="mr-2 h-4 w-4" />
                Atrás
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Continuar
                    <Icons.arrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <Icons.shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Datos protegidos</p>
              <p className="text-sm text-muted-foreground">
                Tu información está protegida según RGPD
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <Icons.eye className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Visibilidad controlada</p>
              <p className="text-sm text-muted-foreground">
                Tú decides qué información mostrar
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
