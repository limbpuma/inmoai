"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Building2,
  Search,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// Mock metrics - would come from tRPC in production
const metrics = [
  {
    title: "Usuarios totales",
    value: "12,543",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    description: "vs mes anterior",
  },
  {
    title: "Listings activos",
    value: "45,231",
    change: "+8.2%",
    trend: "up",
    icon: Building2,
    description: "en todas las ciudades",
  },
  {
    title: "Busquedas hoy",
    value: "3,847",
    change: "-2.1%",
    trend: "down",
    icon: Search,
    description: "vs ayer",
  },
  {
    title: "Ingresos MRR",
    value: "€8,234",
    change: "+23.1%",
    trend: "up",
    icon: CreditCard,
    description: "recurrente mensual",
  },
];

export function MetricsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const TrendIcon = metric.trend === "up" ? ArrowUpRight : ArrowDownRight;
        const trendColor = metric.trend === "up" ? "text-green-600" : "text-red-600";
        const trendBg = metric.trend === "up" ? "bg-green-50" : "bg-red-50";

        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${trendBg} ${trendColor}`}
                >
                  <TrendIcon className="h-3 w-3 mr-0.5" />
                  {metric.change}
                </span>
                <span className="text-xs text-muted-foreground">
                  {metric.description}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
