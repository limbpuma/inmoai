"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">InmoAI</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            {t("rightsReserved", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
