"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  Wrench,
  CheckCircle2,
  Plus,
  X,
  Loader2,
  PaintBucket,
  Zap,
  Droplets,
  TreeDeciduous,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Tu negocio", icon: Building2 },
  { id: 2, title: "Ubicacion", icon: MapPin },
  { id: 3, title: "Servicios", icon: Wrench },
];

const categoryOptions: Array<{
  value: string;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "painting", label: "Pintura", icon: PaintBucket },
  { value: "renovation", label: "Reformas", icon: Wrench },
  { value: "electrical", label: "Electricidad", icon: Zap },
  { value: "plumbing", label: "Fontaneria", icon: Droplets },
  { value: "garden", label: "Jardin / Exterior", icon: TreeDeciduous },
  { value: "general", label: "General", icon: Lightbulb },
];

interface ServiceInput {
  category: string;
  title: string;
  description: string;
  priceMin: string;
  priceMax: string;
  priceUnit: string;
}

const emptyService: ServiceInput = {
  category: "",
  title: "",
  description: "",
  priceMin: "",
  priceMax: "",
  priceUnit: "proyecto",
};

export default function RegistroProveedorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  // Step 1: Business info
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Step 2: Location
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [coverageRadius, setCoverageRadius] = useState("25");

  // Step 3: Services
  const [services, setServices] = useState<ServiceInput[]>([{ ...emptyService }]);

  const registerMutation = trpc.marketplace.registerProvider.useMutation({
    onSuccess: (data) => {
      router.push(`/servicios/${data.slug}?registered=true`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

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

  const updateService = (index: number, field: keyof ServiceInput, value: string) => {
    setServices(
      services.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const canAdvance = () => {
    if (step === 1) {
      return businessName.length >= 2 && contactName.length >= 2 && contactEmail.includes("@") && contactPhone.length >= 6;
    }
    if (step === 2) {
      return city.length >= 1;
    }
    if (step === 3) {
      return services.every((s) => s.category && s.title.length >= 2);
    }
    return false;
  };

  const handleSubmit = () => {
    setError("");

    // Default coordinates for major Spanish cities
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      madrid: { lat: 40.4168, lng: -3.7038 },
      barcelona: { lat: 41.3874, lng: 2.1686 },
      valencia: { lat: 39.4699, lng: -0.3763 },
      sevilla: { lat: 37.3891, lng: -5.9845 },
      malaga: { lat: 36.7213, lng: -4.4214 },
      zaragoza: { lat: 41.6488, lng: -0.8891 },
      bilbao: { lat: 43.2630, lng: -2.9350 },
    };

    const cityKey = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const coords = cityCoords[cityKey] || { lat: 40.4168, lng: -3.7038 };

    registerMutation.mutate({
      businessName,
      description: description || undefined,
      contactName,
      contactEmail,
      contactPhone,
      website: website || undefined,
      address: address || undefined,
      city,
      province: province || undefined,
      postalCode: postalCode || undefined,
      latitude: coords.lat,
      longitude: coords.lng,
      coverageRadiusKm: parseInt(coverageRadius) || 25,
      services: services
        .filter((s) => s.category && s.title)
        .map((s) => ({
          category: s.category as "painting" | "renovation" | "electrical" | "plumbing" | "garden" | "general",
          title: s.title,
          description: s.description || undefined,
          priceMin: s.priceMin ? parseFloat(s.priceMin) : undefined,
          priceMax: s.priceMax ? parseFloat(s.priceMax) : undefined,
          priceUnit: s.priceUnit,
        })),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back link */}
        <Link
          href="/servicios"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a profesionales
        </Link>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Registrate como profesional</h1>
          <p className="text-muted-foreground">
            Conecta con propietarios que buscan tus servicios
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={cn("h-px w-8", isCompleted ? "bg-primary" : "bg-border")} />
                )}
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/10 text-primary",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form */}
        <div className="rounded-xl border bg-card p-6">
          {/* Step 1: Business info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Nombre del negocio *</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Reformas Martinez S.L."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripcion</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe tu negocio, experiencia y especialidades..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactName">Nombre de contacto *</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Juan Martinez"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Telefono *</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+34 612 345 678"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contactEmail">Email de contacto *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="info@reformasmartinez.es"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="website">Sitio web</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.reformasmartinez.es"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Direccion</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle Mayor 10, Local 2"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Madrid"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="province">Provincia</Label>
                  <Input
                    id="province"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Madrid"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">Codigo postal</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="28001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="coverage">Radio de cobertura (km)</Label>
                  <Select value={coverageRadius} onValueChange={setCoverageRadius}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 km</SelectItem>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="25">25 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                      <SelectItem value="100">100 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Services */}
          {step === 3 && (
            <div className="space-y-6">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="relative rounded-lg border bg-muted/30 p-4 space-y-3"
                >
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <Label>Titulo del servicio *</Label>
                      <Input
                        value={service.title}
                        onChange={(e) => updateService(index, "title", e.target.value)}
                        placeholder="Pintura de interiores"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Descripcion</Label>
                    <Input
                      value={service.description}
                      onChange={(e) => updateService(index, "description", e.target.value)}
                      placeholder="Describe el servicio..."
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Precio min.</Label>
                      <Input
                        type="number"
                        value={service.priceMin}
                        onChange={(e) => updateService(index, "priceMin", e.target.value)}
                        placeholder="200"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Precio max.</Label>
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
                </div>
              ))}

              {services.length < 10 && (
                <Button type="button" variant="outline" onClick={addService} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar otro servicio
                </Button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canAdvance() || registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Completar registro
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* CTA for existing users */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes un perfil?{" "}
            <Link href="/dashboard/proveedor" className="text-primary hover:underline">
              Ir a mi panel de proveedor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
