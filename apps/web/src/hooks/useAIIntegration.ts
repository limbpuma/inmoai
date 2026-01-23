"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIFunction, AIMode, AIEvent, AIAction } from "@/types/adminAI";

/**
 * Hook for integrating AI system with real-time updates
 * Connects frontend store with backend via tRPC/WebSocket
 */
export function useAIIntegration() {
  const store = useAdminAIStore();
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Use ref to hold sync function for reconnect callback
  const syncRef = useRef<(() => Promise<void>) | null>(null);

  // Handle reconnection logic
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);

      setTimeout(() => {
        syncRef.current?.();
      }, delay);
    }
  }, []);

  // Sync local state with backend
  const syncWithBackend = useCallback(async () => {
    try {
      // In real implementation, would call tRPC endpoints:
      // const status = await trpc.ai.getStatus.query();
      // const pendingTasks = await trpc.ai.getPendingTasks.query();

      setLastSync(new Date());
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Update local store with backend state
      // store.setMode(status.mode);
      // etc.
    } catch (error) {
      console.error("Failed to sync with backend:", error);
      setIsConnected(false);
      handleReconnect();
    }
  }, [handleReconnect]);

  // Keep sync ref updated in effect to avoid mutating during render
  useEffect(() => {
    syncRef.current = syncWithBackend;
  }, [syncWithBackend]);

  // Push action to backend
  const pushAction = useCallback(
    async (func: AIFunction, _params?: Record<string, unknown>) => {
      try {
        // In real implementation:
        // const result = await trpc.ai.triggerFunction.mutate({
        //   function: func,
        //   params,
        //   skipApproval: store.config.mode !== 'lazy',
        // });

        store.addEvent({
          type: "start",
          function: func,
          message: `Accion enviada al servidor`,
          severity: "info",
        });

        return true;
      } catch (error) {
        store.addEvent({
          type: "error",
          function: func,
          message: `Error al enviar accion: ${error}`,
          severity: "error",
        });
        return false;
      }
    },
    [store]
  );

  // Push mode change to backend
  const pushModeChange = useCallback(
    async (mode: AIMode) => {
      try {
        // await trpc.ai.setMode.mutate({ mode });
        store.setMode(mode);
        return true;
      } catch (error) {
        console.error("Failed to update mode:", error);
        return false;
      }
    },
    [store]
  );

  // Push decision approval to backend
  const pushDecisionApproval = useCallback(
    async (decisionId: string, approved: boolean) => {
      try {
        if (approved) {
          // await trpc.ai.approveTask.mutate({ taskId: decisionId });
          store.approveDecision(decisionId);
        } else {
          // await trpc.ai.rejectTask.mutate({ taskId: decisionId });
          store.rejectDecision(decisionId);
        }
        return true;
      } catch (error) {
        console.error("Failed to process decision:", error);
        return false;
      }
    },
    [store]
  );

  // Initial sync on mount
  useEffect(() => {
    syncWithBackend();

    // Periodic sync every 30 seconds
    const interval = setInterval(syncWithBackend, 30000);

    return () => clearInterval(interval);
  }, [syncWithBackend]);

  return {
    isConnected,
    lastSync,
    syncWithBackend,
    pushAction,
    pushModeChange,
    pushDecisionApproval,
  };
}

/**
 * Hook for WebSocket-based real-time AI updates
 */
export function useAIWebSocket(options?: {
  onEvent?: (event: AIEvent) => void;
  onActionUpdate?: (action: AIAction) => void;
  autoConnect?: boolean;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const store = useAdminAIStore();

  const connect = useCallback(() => {
    // In real implementation, would connect to WebSocket server
    // const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ai";

    try {
      // Simulated connection (WebSocket not implemented)
      // wsRef.current = new WebSocket(wsUrl);

      // wsRef.current.onopen = () => {
      //   setIsConnected(true);
      //   console.log("AI WebSocket connected");
      // };

      // wsRef.current.onmessage = (event) => {
      //   const data = JSON.parse(event.data);
      //   handleMessage(data);
      // };

      // wsRef.current.onclose = () => {
      //   setIsConnected(false);
      //   // Attempt reconnection
      //   setTimeout(connect, 5000);
      // };

      // For demo, simulate async connection (deferred to avoid sync setState in effect)
      queueMicrotask(() => {
        setIsConnected(true);
      });
    } catch (error) {
      console.error("WebSocket connection failed:", error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Note: handleMessage is defined but will be used when WebSocket is implemented
  const _handleMessage = useCallback(
    (data: { type: string; payload: unknown }) => {
      const payload = data.payload as Record<string, unknown>;
      switch (data.type) {
        case "EVENT":
          store.addEvent(payload as Parameters<typeof store.addEvent>[0]);
          options?.onEvent?.(payload as AIEvent);
          break;
        case "ACTION_UPDATE":
          store.updateAction(payload.id as string, payload as Partial<AIAction>);
          options?.onActionUpdate?.(payload as AIAction);
          break;
        case "DECISION_REQUIRED":
          store.addDecision(payload as Parameters<typeof store.addDecision>[0]);
          break;
        case "ALERT":
          store.addAlert(payload as Parameters<typeof store.addAlert>[0]);
          break;
        default:
          console.log("Unknown WebSocket message type:", data.type);
      }
    },
    [store, options]
  );

  useEffect(() => {
    if (options?.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, options?.autoConnect]);

  return {
    isConnected,
    connect,
    disconnect,
  };
}
