"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  Save,
  Loader2,
  PaintBucket,
  Wrench,
  Zap,
  Droplets,
  TreeDeciduous,
  Lightbulb,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

const categoryOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "painting", label: "Pintura", icon: PaintBucket },
  { value: "renovation", label: "Reformas", icon: Wrench },
  { value: "electrical", label: "Electricidad", icon: Zap },
  { value: "plumbing", label: "Fontaneria", icon: Droplets },
  { value: "garden", label: "Jardin / Exterior", icon: TreeDeciduous },
  { value: "general", label: "General", icon: Lightbulb },
];

interface ServiceForm {
  id?: string;
  category: string;
  title: string;
  description: string;
  priceMin: string;
  priceMax: string;
  priceUnit: string;
  isActive: boolean;
}

const emptyService: ServiceForm = {
  category: "",
  title: "",
  description: "",
  priceMin: "",
  priceMax: "",
  priceUnit: "proyecto",
  isActive: true,
};

export default function ServiciosPage() {
  const [services, setServices] = useState<ServiceForm[]>([]);
  const [saved, setSaved] = useState(false);

  const { data: provider, isLoading } = trpc.marketplace.getMyProvider.useQuery();

  const updateMutation = trpc.marketplace.updateMyServices.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  useEffect(() => {
    if (provider?.services) {
      setServices(
        provider.services.map((s) => ({
          id: s.id,
          category: s.category,
          title: s.title,
          description: s.description || "",
          priceMin: s.priceMin?.toString() || "",
          priceMax: s.priceMax?.toString() || "",
          priceUnit: s.priceUnit || "proyecto",
          isActive: s.isActive ?? true,
        }))
      );
    }
  }, [provider]);

  const addService = () => {
    if (services.length < 10) {
      setServices([...services, { ...emptyService }]);
    }
  };

  const removeService = (index: number) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const updateService = (index: number, field: keyof ServiceForm, value: string | boolean) => {
    setServices(
      services.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = () => {
    const validServices = services.filter((s) => s.category && s.title.length >= 2);
    if (validServices.length === 0) return;

    updateMutation.mutate({
      services: validServices.map((s) => ({
        category: s.category as "painting",
        title: s.title,
        description: s.description || undefined,
        priceMin: s.priceMin ? parseFloat(s.priceMin) : undefined,
        priceMax: s.priceMax ? parseFloat(s.priceMax) : undefined,
        priceUnit: s.priceUnit,
        isActive: s.isActive,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No tienes un perfil de profesional.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis servicios</h1>
          <p className="text-muted-foreground">Gestiona los servicios que ofreces</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saved ? "Guardado" : "Guardar cambios"}
        </Button>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Servicio {index + 1}
                </span>
                {services.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    className="p-1 rounded-md hover:bg-muted"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label>Categoria *</Label>
                  <Select
                    value={service.category}
                    onValueChange={(val) => updateService(index, "category", val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Titulo *</Label>
                  <Input
                    value={service.title}
                    onChange={(e) => updateService(index, "title", e.target.value)}
                    placeholder="Pintura de interiores"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="mb-3">
                <Label>Descripcion</Label>
                <Input
                  value={service.description}
                  onChange={(e) => updateService(index, "description", e.target.value)}
                  placeholder="Detalla el servicio..."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Precio min. (EUR)</Label>
                  <Input
                    type="number"
                    value={service.priceMin}
                    onChange={(e) => updateService(index, "priceMin", e.target.value)}
                    placeholder="200"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Precio max. (EUR)</Label>
                  <Input
                    type="number"
                    value={service.priceMax}
                    onChange={(e) => updateService(index, "priceMax", e.target.value)}
                    placeholder="1500"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Unidad</Label>
                  <Select
                    value={service.priceUnit}
                    onValueChange={(val) => updateService(index, "priceUnit", val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proyecto">Por proyecto</SelectItem>
                      <SelectItem value="hora">Por hora</SelectItem>
                      <SelectItem value="m2">Por m2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {services.length < 10 && (
          <Button variant="outline" onClick={addService} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar servicio
          </Button>
        )}
      </div>
    </div>
  );
}
