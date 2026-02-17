/**
 * useAIWebSocket - Hook for real-time AI event sync via WebSocket
 * Connects to the backend WebSocket server and syncs events to the store
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAdminAIStore } from '@/stores/adminAIStore';
import type { AIFunction } from '@/types/adminAI';

interface WSEvent {
  type:
    | 'status_change'
    | 'task_start'
    | 'task_complete'
    | 'task_error'
    | 'mode_change'
    | 'decision_required'
    | 'alert';
  timestamp: string;
  data: Record<string, unknown>;
}

interface UseAIWebSocketOptions {
  /** WebSocket URL (defaults to ws://localhost:9091/api/ws/ai) */
  url?: string;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect interval in ms */
  reconnectInterval?: number;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
  /** Enable the connection */
  enabled?: boolean;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useAIWebSocket(options: UseAIWebSocketOptions = {}) {
  const {
    url = `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:9091/api/ws/ai`,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    enabled = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);

  const addEvent = useAdminAIStore((s) => s.addEvent);
  const addAlert = useAdminAIStore((s) => s.addAlert);
  const addDecision = useAdminAIStore((s) => s.addDecision);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);
        setLastEvent(wsEvent);
        setEventCount((c) => c + 1);

        const func = (wsEvent.data.function as AIFunction) ?? 'data_pipeline';

        switch (wsEvent.type) {
          case 'status_change':
            addEvent({
              type: 'alert',
              function: func,
              message: (wsEvent.data.message as string) ?? 'Estado actualizado',
              severity: 'info',
            });
            break;

          case 'task_start':
            addEvent({
              type: 'start',
              function: func,
              message: `Tarea iniciada: ${func}`,
              severity: 'info',
            });
            break;

          case 'task_complete':
            addEvent({
              type: 'complete',
              function: func,
              message:
                (wsEvent.data.details as string) ??
                `Tarea completada: ${func}`,
              severity: wsEvent.data.success ? 'success' : 'error',
              data: wsEvent.data,
            });
            break;

          case 'task_error':
            addEvent({
              type: 'error',
              function: func,
              message: (wsEvent.data.error as string) ?? 'Error en tarea',
              severity: 'error',
            });
            addAlert({
              function: func,
              severity: 'error',
              title: `Error en ${func}`,
              message: (wsEvent.data.error as string) ?? 'Error desconocido',
            });
            break;

          case 'mode_change':
            addEvent({
              type: 'alert',
              function: func,
              message:
                (wsEvent.data.message as string) ?? 'Modo de IA cambiado',
              severity: 'info',
            });
            break;

          case 'decision_required':
            addDecision({
              function: func,
              action: (wsEvent.data.description as string) ?? '',
              description: (wsEvent.data.description as string) ?? '',
              impact: (wsEvent.data.impact as 'low' | 'medium' | 'high') ?? 'medium',
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
            break;

          case 'alert':
            addAlert({
              function: func,
              severity:
                (wsEvent.data.severity as 'info' | 'warning' | 'error' | 'critical') ?? 'info',
              title: (wsEvent.data.title as string) ?? 'Alerta',
              message: (wsEvent.data.message as string) ?? '',
            });
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    },
    [addEvent, addAlert, addDecision]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;

        if (
          autoReconnect &&
          reconnectCountRef.current < maxReconnectAttempts
        ) {
          reconnectCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(
            connect,
            reconnectInterval
          );
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
      };

      wsRef.current = ws;
    } catch {
      setConnectionStatus('error');
    }
  }, [url, autoReconnect, reconnectInterval, maxReconnectAttempts, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    reconnectCountRef.current = maxReconnectAttempts; // prevent auto-reconnect
    wsRef.current?.close();
    wsRef.current = null;
    setConnectionStatus('disconnected');
  }, [maxReconnectAttempts]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [enabled, connect, disconnect]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastEvent,
    eventCount,
    connect,
    disconnect,
    reconnectAttempts: reconnectCountRef.current,
  };
}
