"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Building2,
  ScrollText,
  Settings,
  Brain,
  BarChart3,
  Shield,
  Activity,
  ChevronRight,
} from "lucide-react";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface SidebarSection {
  section: string;
  links: SidebarLink[];
}

const sidebarSections: SidebarSection[] = [
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
        badgeVariant: "secondary",
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

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "w-64 flex-shrink-0 border-r bg-muted/30 flex flex-col",
        className
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">InmoAI</span>
            <Badge variant="secondary" className="text-xs">
              Admin
            </Badge>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {sidebarSections.map((section) => (
          <div key={section.section}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              {section.section}
            </h4>
            <div className="space-y-1">
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = isLinkActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110")} />
                    <span className="flex-1">{link.label}</span>
                    {link.badge && (
                      <Badge
                        variant={link.badgeVariant || "secondary"}
                        className={cn(
                          "text-xs",
                          isActive && "bg-primary-foreground/20 text-primary-foreground"
                        )}
                      >
                        {link.badge}
                      </Badge>
                    )}
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 opacity-0 -translate-x-2 transition-all",
                        "group-hover:opacity-100 group-hover:translate-x-0",
                        isActive && "opacity-100 translate-x-0"
                      )}
                    />
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
          <div className="relative">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <span className="text-muted-foreground">Sistema operativo</span>
        </div>
      </div>
    </aside>
  );
}
