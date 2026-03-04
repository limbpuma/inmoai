"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  User,
  Bell,
  Shield,
  Trash2,
  LogOut,
  Loader2,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Form state
  const [name, setName] = useState(session?.user?.name || "");
  const [notifications, setNotifications] = useState({
    email: true,
    newListings: true,
    priceDrops: true,
    weeklyDigest: false,
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleDeleteAccount = async () => {
    // In production, this would call the tRPC mutation
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Ajustes
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Perfil</CardTitle>
          </div>
          <CardDescription>
            Tu informacion personal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El email no se puede cambiar
              </p>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : isSaved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Guardado
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notificaciones</CardTitle>
          </div>
          <CardDescription>
            Configura como quieres recibir alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones por email</Label>
              <p className="text-sm text-muted-foreground">
                Recibir notificaciones en tu correo
              </p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, email: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Nuevos anuncios</Label>
              <p className="text-sm text-muted-foreground">
                Cuando aparezcan propiedades que coincidan con tus alertas
              </p>
            </div>
            <Switch
              checked={notifications.newListings}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, newListings: checked }))
              }
              disabled={!notifications.email}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bajadas de precio</Label>
              <p className="text-sm text-muted-foreground">
                Cuando baje el precio de tus propiedades guardadas
              </p>
            </div>
            <Switch
              checked={notifications.priceDrops}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, priceDrops: checked }))
              }
              disabled={!notifications.email}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Resumen semanal</Label>
              <p className="text-sm text-muted-foreground">
                Recibe un email semanal con las mejores oportunidades
              </p>
            </div>
            <Switch
              checked={notifications.weeklyDigest}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, weeklyDigest: checked }))
              }
              disabled={!notifications.email}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Seguridad</CardTitle>
          </div>
          <CardDescription>
            Gestiona la seguridad de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Cambiar contrasena</p>
              <p className="text-sm text-muted-foreground">
                Actualiza tu contrasena periodicamente
              </p>
            </div>
            <Button variant="outline">Cambiar</Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Sesiones activas</p>
              <p className="text-sm text-muted-foreground">
                Gestiona los dispositivos conectados
              </p>
            </div>
            <Button variant="outline">Ver sesiones</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            <CardTitle className="text-red-600">Zona de peligro</CardTitle>
          </div>
          <CardDescription>
            Acciones irreversibles de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
            <div>
              <p className="font-medium">Cerrar sesion</p>
              <p className="text-sm text-muted-foreground">
                Cierra tu sesion en este dispositivo
              </p>
            </div>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesion
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
            <div>
              <p className="font-medium">Eliminar cuenta</p>
              <p className="text-sm text-muted-foreground">
                Elimina permanentemente tu cuenta y todos tus datos
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar cuenta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    ¿Estas seguro de que quieres eliminar tu cuenta?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta accion no se puede deshacer. Se eliminaran permanentemente
                    tu cuenta, tus busquedas guardadas, favoritos y cualquier otro
                    dato asociado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleDeleteAccount}
                  >
                    Si, eliminar mi cuenta
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
