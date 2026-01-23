"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Calendar,
  MapPin,
  Search,
  Heart,
  CreditCard,
  Clock,
  Shield,
  Ban,
  Trash2,
  Edit,
  Crown,
  Activity,
} from "lucide-react";

// Mock user details
const mockUserDetails: Record<string, any> = {
  "1": {
    id: "1",
    name: "Juan Garcia",
    email: "juan@example.com",
    role: "user",
    status: "active",
    createdAt: "2024-01-15",
    lastLogin: "2024-01-23",
    location: "Madrid, Espana",
    phone: "+34 612 345 678",
    searches: 45,
    favorites: 12,
    alerts: 3,
    subscription: null,
    activity: [
      { action: "Busqueda", details: "Piso 3 hab Barcelona", time: "Hace 2 horas" },
      { action: "Favorito", details: "Atico en Gracia", time: "Hace 5 horas" },
      { action: "Login", details: "Chrome / Windows", time: "Hace 6 horas" },
      { action: "Alerta creada", details: "Valencia centro", time: "Hace 1 dia" },
    ],
  },
  "2": {
    id: "2",
    name: "Maria Lopez",
    email: "maria@example.com",
    role: "premium",
    status: "active",
    createdAt: "2024-01-10",
    lastLogin: "2024-01-23",
    location: "Barcelona, Espana",
    phone: "+34 623 456 789",
    searches: 234,
    favorites: 28,
    alerts: 15,
    subscription: {
      plan: "Pro",
      status: "active",
      startDate: "2024-01-10",
      nextBilling: "2024-02-10",
      amount: "9.99€/mes",
    },
    activity: [
      { action: "Busqueda", details: "Casa con jardin Madrid", time: "Hace 1 hora" },
      { action: "Exportar PDF", details: "Comparativa 5 pisos", time: "Hace 3 horas" },
      { action: "Login", details: "Safari / macOS", time: "Hace 4 horas" },
    ],
  },
  "3": {
    id: "3",
    name: "Inmobiliaria ABC",
    email: "info@inmobiliariabc.com",
    role: "agency",
    status: "active",
    createdAt: "2023-12-05",
    lastLogin: "2024-01-22",
    location: "Valencia, Espana",
    phone: "+34 634 567 890",
    searches: 1523,
    favorites: 0,
    alerts: 50,
    subscription: {
      plan: "Agency",
      status: "active",
      startDate: "2023-12-05",
      nextBilling: "2024-01-05",
      amount: "49.99€/mes",
    },
    activity: [
      { action: "API Call", details: "GET /listings (234 results)", time: "Hace 30 min" },
      { action: "Export", details: "CSV 500 listings", time: "Hace 2 horas" },
      { action: "Login", details: "API Token", time: "Hace 3 horas" },
    ],
  },
};

interface UserDetailSheetProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

export function UserDetailSheet({ userId, open, onClose }: UserDetailSheetProps) {
  if (!userId) return null;

  const user = mockUserDetails[userId] || mockUserDetails["1"];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
      case "agency":
        return <Badge className="bg-blue-100 text-blue-800">Agencia</Badge>;
      case "premium":
        return <Badge className="bg-amber-100 text-amber-800">Premium</Badge>;
      default:
        return <Badge variant="secondary">Usuario</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Activo
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Suspendido
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalles del usuario</SheetTitle>
          <SheetDescription>
            Informacion completa y acciones disponibles
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* User Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
              <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Registro:</span>
              <span>{new Date(user.createdAt).toLocaleDateString("es-ES")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ultimo acceso:</span>
              <span>{new Date(user.lastLogin).toLocaleDateString("es-ES")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ubicacion:</span>
              <span>{user.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Telefono:</span>
              <span>{user.phone}</span>
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <Search className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{user.searches}</p>
              <p className="text-xs text-muted-foreground">Busquedas</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Heart className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{user.favorites}</p>
              <p className="text-xs text-muted-foreground">Favoritos</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Activity className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{user.alerts}</p>
              <p className="text-xs text-muted-foreground">Alertas</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="activity" className="flex-1">Actividad</TabsTrigger>
              <TabsTrigger value="subscription" className="flex-1">Suscripcion</TabsTrigger>
              <TabsTrigger value="actions" className="flex-1">Acciones</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4 space-y-3">
              {user.activity.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted"
                >
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="subscription" className="mt-4">
              {user.subscription ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold">Plan {user.subscription.plan}</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Activo
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Inicio:</span>
                        <span className="ml-2">
                          {new Date(user.subscription.startDate).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prox. cobro:</span>
                        <span className="ml-2">
                          {new Date(user.subscription.nextBilling).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Importe:</span>
                        <span className="ml-2 font-medium">{user.subscription.amount}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Ver historial de pagos
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Sin suscripcion activa</p>
                  <Button className="mt-4" variant="outline">
                    <Crown className="h-4 w-4 mr-2" />
                    Asignar plan
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cambiar rol</label>
                <Select defaultValue={user.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="agency">Agencia</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar email
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar perfil
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Restablecer contrasena
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {user.status === "suspended" ? "Reactivar cuenta" : "Suspender cuenta"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar cuenta
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
