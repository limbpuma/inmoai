"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  MessageSquare,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReviewsPage() {
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState("");

  const { data, isLoading, refetch } = trpc.marketplace.getMyReviews.useQuery({ limit: 50 });

  const respondMutation = trpc.marketplace.respondToReview.useMutation({
    onSuccess: () => {
      setRespondingTo(null);
      setResponse("");
      refetch();
    },
  });

  const handleRespond = (reviewId: string) => {
    if (!response.trim()) return;
    respondMutation.mutate({ reviewId, response: response.trim() });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Opiniones</h1>
        <p className="text-muted-foreground">
          {data?.total || 0} opiniones de clientes
        </p>
      </div>

      {data?.reviews && data.reviews.length > 0 ? (
        <div className="space-y-4">
          {data.reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-5">
                {/* Review header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.authorName || "Usuario"}</span>
                      {review.isVerified && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= review.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString("es-ES")}
                  </span>
                </div>

                {/* Review content */}
                {review.title && <h4 className="font-medium mb-1">{review.title}</h4>}
                {review.content && (
                  <p className="text-sm text-muted-foreground mb-3">{review.content}</p>
                )}

                {/* Provider response */}
                {review.providerResponse ? (
                  <div className="mt-3 pl-4 border-l-2 border-primary/20 bg-muted/30 p-3 rounded-r-lg">
                    <p className="text-xs font-medium text-primary mb-1">Tu respuesta</p>
                    <p className="text-sm text-muted-foreground">{review.providerResponse}</p>
                    {review.providerRespondedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(review.providerRespondedAt).toLocaleDateString("es-ES")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3">
                    {respondingTo === review.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRespond(review.id)}
                            disabled={!response.trim() || respondMutation.isPending}
                          >
                            {respondMutation.isPending ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            Enviar respuesta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setRespondingTo(null); setResponse(""); }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRespondingTo(review.id)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Responder
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Sin opiniones</h3>
            <p className="text-sm text-muted-foreground">
              Las opiniones de tus clientes apareceran aqui.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
