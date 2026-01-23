"use client";

import { cn } from "@/lib/utils";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import type { VoiceSearchStatus, VoiceSearchError } from "@/hooks/useVoiceSearch";

interface VoiceIndicatorProps {
  status: VoiceSearchStatus;
  error?: VoiceSearchError | null;
  interimTranscript?: string;
  className?: string;
}

export function VoiceIndicator({
  status,
  error,
  interimTranscript,
  className,
}: VoiceIndicatorProps) {
  if (status === "idle" && !error) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 mt-2 p-4 rounded-xl border shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200",
        status === "listening" && "bg-primary/5 border-primary/30",
        status === "processing" && "bg-muted border-border",
        status === "error" && "bg-destructive/5 border-destructive/30",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            status === "listening" && "bg-primary/20 text-primary",
            status === "processing" && "bg-muted-foreground/20 text-muted-foreground",
            status === "error" && "bg-destructive/20 text-destructive"
          )}
        >
          {status === "listening" && (
            <Mic className="h-5 w-5 animate-pulse" />
          )}
          {status === "processing" && (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          {status === "error" && (
            <MicOff className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {status === "listening" && (
            <>
              <p className="text-sm font-medium text-primary">
                Escuchando...
              </p>
              {interimTranscript && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  &ldquo;{interimTranscript}&rdquo;
                </p>
              )}
              {!interimTranscript && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Habla ahora para buscar
                </p>
              )}
            </>
          )}

          {status === "processing" && (
            <p className="text-sm text-muted-foreground">
              Procesando tu búsqueda...
            </p>
          )}

          {status === "error" && error && (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {error.message}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Haz clic en el micrófono para intentar de nuevo
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Listening animation */}
        {status === "listening" && (
          <div className="flex items-center gap-1">
            <span className="w-1 h-3 bg-primary rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
            <span className="w-1 h-5 bg-primary rounded-full animate-[pulse_0.5s_ease-in-out_0.1s_infinite]" />
            <span className="w-1 h-4 bg-primary rounded-full animate-[pulse_0.5s_ease-in-out_0.2s_infinite]" />
            <span className="w-1 h-6 bg-primary rounded-full animate-[pulse_0.5s_ease-in-out_0.3s_infinite]" />
            <span className="w-1 h-3 bg-primary rounded-full animate-[pulse_0.5s_ease-in-out_0.4s_infinite]" />
          </div>
        )}
      </div>
    </div>
  );
}
