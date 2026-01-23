"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, LineChart, PieChart, TrendingUp } from "lucide-react";

// Mock data for charts
const dailySearches = [
  { day: "Lun", searches: 1200 },
  { day: "Mar", searches: 1350 },
  { day: "Mie", searches: 1100 },
  { day: "Jue", searches: 1500 },
  { day: "Vie", searches: 1800 },
  { day: "Sab", searches: 2100 },
  { day: "Dom", searches: 1900 },
];

const userGrowth = [
  { month: "Ene", users: 8500 },
  { month: "Feb", users: 9200 },
  { month: "Mar", users: 9800 },
  { month: "Abr", users: 10500 },
  { month: "May", users: 11200 },
  { month: "Jun", users: 12543 },
];

const revenueByPlan = [
  { plan: "Pro", revenue: 5840, percentage: 71 },
  { plan: "Agency", revenue: 2394, percentage: 29 },
];

const listingsByCity = [
  { city: "Madrid", count: 18500, percentage: 41 },
  { city: "Barcelona", count: 15200, percentage: 34 },
  { city: "Valencia", count: 7500, percentage: 16 },
  { city: "Otros", count: 4031, percentage: 9 },
];

// Simple bar chart component
function SimpleBarChart({ data, valueKey, labelKey, maxValue }: {
  data: Record<string, any>[],
  valueKey: string,
  labelKey: string,
  maxValue?: number
}) {
  const max = maxValue || Math.max(...data.map(d => d[valueKey]));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item[labelKey]}</span>
            <span className="font-medium">{item[valueKey].toLocaleString()}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(item[valueKey] / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple percentage bar
function PercentageBar({ data, colorKey = "percentage" }: {
  data: { name: string; value: number; percentage: number; color?: string }[],
  colorKey?: string
}) {
  const colors = ["bg-primary", "bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500"];

  return (
    <div className="space-y-4">
      <div className="h-4 rounded-full overflow-hidden flex">
        {data.map((item, index) => (
          <div
            key={index}
            className={`${colors[index % colors.length]} transition-all`}
            style={{ width: `${item.percentage}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
            <span className="text-sm text-muted-foreground">{item.name}</span>
            <span className="text-sm font-medium ml-auto">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Charts() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Searches Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Busquedas
            </CardTitle>
            <CardDescription>Ultimos 7 dias</CardDescription>
          </div>
          <Select defaultValue="7d">
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <SimpleBarChart
            data={dailySearches}
            valueKey="searches"
            labelKey="day"
          />
        </CardContent>
      </Card>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Crecimiento de usuarios
          </CardTitle>
          <CardDescription>Ultimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart
            data={userGrowth}
            valueKey="users"
            labelKey="month"
          />
        </CardContent>
      </Card>

      {/* Revenue by Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Ingresos por plan
          </CardTitle>
          <CardDescription>Distribucion mensual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold">€8,234</div>
              <p className="text-sm text-muted-foreground">MRR total</p>
            </div>
            <PercentageBar
              data={revenueByPlan.map(r => ({
                name: r.plan,
                value: r.revenue,
                percentage: r.percentage
              }))}
            />
            <div className="pt-2 space-y-2">
              {revenueByPlan.map((plan, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{plan.plan}</span>
                  <span className="font-medium">€{plan.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings by City */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Listings por ciudad
          </CardTitle>
          <CardDescription>Distribucion geografica</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold">45,231</div>
              <p className="text-sm text-muted-foreground">Listings totales</p>
            </div>
            <PercentageBar
              data={listingsByCity.map(c => ({
                name: c.city,
                value: c.count,
                percentage: c.percentage
              }))}
            />
            <div className="pt-2 space-y-2">
              {listingsByCity.map((city, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{city.city}</span>
                  <span className="font-medium">{city.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
