"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Eye,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: "Nuevo", color: "bg-blue-100 text-blue-700", icon: FileText },
  viewed: { label: "Visto", color: "bg-yellow-100 text-yellow-700", icon: Eye },
  contacted: { label: "Contactado", color: "bg-amber-100 text-amber-700", icon: Phone },
  quoted: { label: "Presupuestado", color: "bg-purple-100 text-purple-700", icon: MessageSquare },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  completed: { label: "Completado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
};

const nextStatuses: Record<string, string[]> = {
  new: ["viewed"],
  viewed: ["contacted"],
  contacted: ["quoted"],
  quoted: ["accepted", "cancelled"],
  accepted: ["completed", "cancelled"],
};

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [quotedAmount, setQuotedAmount] = useState("");

  const { data, isLoading, refetch } = trpc.marketplace.getMyLeads.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter as "new",
    limit: 50,
  });

  const updateStatus = trpc.marketplace.updateLeadStatus.useMutation({
    onSuccess: () => {
      refetch();
      setQuotedAmount("");
    },
  });

  const handleStatusUpdate = (leadId: string, newStatus: string) => {
    updateStatus.mutate({
      leadId,
      status: newStatus as "viewed",
      quotedAmount: newStatus === "quoted" && quotedAmount ? parseFloat(quotedAmount) : undefined,
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            {data?.total || 0} solicitudes de presupuesto
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data?.leads && data.leads.length > 0 ? (
        <div className="space-y-3">
          {data.leads.map((lead) => {
            const config = statusConfig[lead.status] || statusConfig.new;
            const StatusIcon = config.icon;
            const isExpanded = expandedLead === lead.id;
            const availableStatuses = nextStatuses[lead.status] || [];

            return (
              <Card key={lead.id}>
                <CardContent className="p-4">
                  {/* Lead header */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", config.color.split(" ")[0])}>
                        <StatusIcon className={cn("h-4 w-4", config.color.split(" ")[1])} />
                      </div>
                      <div>
                        <p className="font-medium">{lead.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {lead.clientName} - {new Date(lead.createdAt).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {lead.budget && (
                        <span className="font-semibold">{formatCurrency(lead.budget)}</span>
                      )}
                      <Badge variant="outline" className={config.color}>
                        {config.label}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Contact info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${lead.clientEmail}`} className="text-primary hover:underline">
                            {lead.clientEmail}
                          </a>
                        </div>
                        {lead.clientPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${lead.clientPhone}`} className="text-primary hover:underline">
                              {lead.clientPhone}
                            </a>
                          </div>
                        )}
                        {lead.workCity && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {lead.workCity}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {lead.description && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {lead.description}
                        </p>
                      )}

                      {/* Extra info */}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {lead.urgency && lead.urgency !== "normal" && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {lead.urgency === "urgent" ? "Urgente" : "Flexible"}
                          </Badge>
                        )}
                        {lead.preferredDate && (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(lead.preferredDate).toLocaleDateString("es-ES")}
                          </Badge>
                        )}
                        {lead.quotedAmount && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            Presupuesto: {formatCurrency(lead.quotedAmount)}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      {availableStatuses.length > 0 && (
                        <div className="flex items-center gap-2 pt-2">
                          {lead.status === "contacted" && (
                            <Input
                              type="number"
                              placeholder="Monto presupuesto"
                              value={quotedAmount}
                              onChange={(e) => setQuotedAmount(e.target.value)}
                              className="w-48"
                            />
                          )}
                          {availableStatuses.map((nextStatus) => {
                            const nextConfig = statusConfig[nextStatus];
                            return (
                              <Button
                                key={nextStatus}
                                size="sm"
                                variant={nextStatus === "cancelled" ? "outline" : "default"}
                                onClick={() => handleStatusUpdate(lead.id, nextStatus)}
                                disabled={updateStatus.isPending}
                              >
                                {updateStatus.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : null}
                                {nextConfig.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Sin leads</h3>
            <p className="text-sm text-muted-foreground">
              Los leads apareceran aqui cuando los propietarios soliciten presupuestos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
