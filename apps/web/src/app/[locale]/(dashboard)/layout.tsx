"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import {
  LayoutDashboard,
  Heart,
  History,
  CreditCard,
  Settings,
  Loader2,
  Briefcase,
  FileText,
  MessageSquare,
  Wrench,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("dashboard");

  const sidebarLinks = [
    { href: "/dashboard", label: t("title"), icon: LayoutDashboard },
    { href: "/dashboard/favorites", label: t("favorites"), icon: Heart },
    { href: "/dashboard/history", label: t("history"), icon: History },
    { href: "/dashboard/subscription", label: t("subscription"), icon: CreditCard },
    { href: "/dashboard/settings", label: t("settings"), icon: Settings },
  ];

  const providerLinks = [
    { href: "/dashboard/proveedor", label: t("myBusiness"), icon: Briefcase },
    { href: "/dashboard/proveedor/leads", label: t("leads"), icon: FileText },
    { href: "/dashboard/proveedor/reviews", label: t("reviews"), icon: MessageSquare },
    { href: "/dashboard/proveedor/servicios", label: t("services"), icon: Wrench },
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30 min-h-[calc(100vh-4rem)]">
          <nav className="flex-1 p-4 space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.endsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            {/* Provider section */}
            {pathname.includes("/dashboard/proveedor") && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    {t("professional")}
                  </p>
                </div>
                {providerLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || pathname.endsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
