"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Loader2, Mail, Phone, User, MessageSquare } from "lucide-react";

const contactFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Introduce un email válido"),
  phone: z.string().optional(),
  message: z.string().max(1000, "El mensaje no puede superar los 1000 caracteres").optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  listingId: string;
  listingTitle: string;
}

export function ContactForm({ listingId, listingTitle }: ContactFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      message: `Hola, me interesa esta propiedad: "${listingTitle}". Me gustaría recibir más información.`,
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement actual lead submission via tRPC
      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Lead submitted:", { listingId, ...data });
      setIsSubmitted(true);
      reset();
    } catch (error) {
      console.error("Error submitting lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                ¡Mensaje enviado!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Nos pondremos en contacto contigo pronto.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitted(false)}
              className="mt-2"
            >
              Enviar otro mensaje
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Contactar</CardTitle>
        <CardDescription>
          Envía tu consulta y te responderemos lo antes posible
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Nombre *
            </Label>
            <Input
              id="name"
              placeholder="Tu nombre"
              {...register("name")}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Teléfono
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+34 600 000 000"
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Mensaje
            </Label>
            <textarea
              id="message"
              rows={3}
              placeholder="Escribe tu mensaje..."
              {...register("message")}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
            {errors.message && (
              <p className="text-xs text-red-500">{errors.message.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar consulta"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Al enviar aceptas nuestra{" "}
            <a href="/privacy" className="underline hover:text-foreground">
              política de privacidad
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
