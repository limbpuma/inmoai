import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profesionales de Confianza para tu Hogar | InmoAI",
  description:
    "Encuentra pintores, electricistas, fontaneros y reformistas verificados cerca de ti. Compara precios, lee opiniones y solicita presupuesto gratis.",
  keywords: [
    "reformas",
    "pintor",
    "electricista",
    "fontanero",
    "profesionales",
    "presupuesto",
    "reformas Madrid",
    "reformas Barcelona",
  ],
  openGraph: {
    title: "Profesionales de Confianza para tu Hogar | InmoAI",
    description:
      "Encuentra pintores, electricistas, fontaneros y reformistas verificados cerca de ti.",
    type: "website",
  },
};

export default function ServiciosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
