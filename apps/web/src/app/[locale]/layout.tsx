import type { Metadata } from "next";
import { Poppins, Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/navigation";
import { Providers } from "@/components/providers/Providers";
import { CookieBanner } from "@/components/legal/CookieBanner";

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
  description:
    "Encuentra tu hogar con inteligencia artificial. El único buscador que te protege de anuncios falsos.",
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body
        className={`${poppins.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <CookieBanner />
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
