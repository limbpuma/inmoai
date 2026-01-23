"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  ScrollText,
  Settings,
  Loader2,
  Brain,
  BarChart3,
  Shield,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const adminSidebarLinks = [
  {
    section: "General",
    links: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    section: "Gestion",
    links: [
      {
        href: "/admin/users",
        label: "Usuarios",
        icon: Users,
      },
      {
        href: "/admin/listings",
        label: "Listings",
        icon: Building2,
      },
    ],
  },
  {
    section: "Sistema",
    links: [
      {
        href: "/admin/ai-control",
        label: "Control IA",
        icon: Brain,
        badge: "Beta",
      },
      {
        href: "/admin/logs",
        label: "Logs",
        icon: ScrollText,
      },
      {
        href: "/admin/settings",
        label: "Configuracion",
        icon: Settings,
      },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || session.user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold">Acceso denegado</h1>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta seccion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Admin Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-muted/30 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold">InmoAI</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                Admin
              </Badge>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {adminSidebarLinks.map((section) => (
            <div key={section.section}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                {section.section}
              </h4>
              <div className="space-y-1">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
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
                      {link.badge && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-auto text-xs",
                            isActive && "border-primary-foreground/30 text-primary-foreground"
                          )}
                        >
                          {link.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Status indicator */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Sistema operativo</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
