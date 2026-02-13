import type { Metadata } from "next";
import { Poppins, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "InmoAI - Portal Inmobiliario Inteligente",
  description: "Encuentra tu hogar con inteligencia artificial. El único buscador que te protege de anuncios falsos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${poppins.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
