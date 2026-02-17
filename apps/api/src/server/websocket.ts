/**
 * WebSocket Server for AI Real-Time Events
 * Broadcasts orchestrator events to connected admin clients
 */

import { AIFunction, AIMode, AIStatus } from "../services/ai/types";
import { aiOrchestrator, TaskResult } from "../services/ai/orchestrator";

// Event types sent over WebSocket
export interface WSEvent {
  type:
    | "status_change"
    | "task_start"
    | "task_complete"
    | "task_error"
    | "mode_change"
    | "decision_required"
    | "alert";
  timestamp: string;
  data: Record<string, unknown>;
}

type WSClient = {
  id: string;
  send: (data: string) => void;
  readyState: number;
};

const WS_OPEN = 1;

class AIEventBroadcaster {
  private clients: Map<string, WSClient> = new Map();
  private eventLog: WSEvent[] = [];
  private maxLogSize = 500;

  /**
   * Register a WebSocket client
   */
  addClient(client: WSClient): void {
    this.clients.set(client.id, client);
    // Send current status on connect
    this.sendTo(client.id, {
      type: "status_change",
      timestamp: new Date().toISOString(),
      data: {
        ...aiOrchestrator.getStatus(),
        message: "Conectado al sistema IA",
      },
    });
  }

  /**
   * Remove a disconnected client
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: WSEvent): void {
    this.eventLog = [event, ...this.eventLog].slice(0, this.maxLogSize);

    const payload = JSON.stringify(event);
    for (const [id, client] of this.clients) {
      if (client.readyState === WS_OPEN) {
        try {
          client.send(payload);
        } catch {
          this.clients.delete(id);
        }
      } else {
        this.clients.delete(id);
      }
    }
  }

  /**
   * Send event to a specific client
   */
  private sendTo(clientId: string, event: WSEvent): void {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WS_OPEN) {
      client.send(JSON.stringify(event));
    }
  }

  /**
   * Get recent events (for clients that reconnect)
   */
  getRecentEvents(limit = 50): WSEvent[] {
    return this.eventLog.slice(0, limit);
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  // --- Convenience methods for common AI events ---

  emitStatusChange(status: AIStatus, message?: string): void {
    this.broadcast({
      type: "status_change",
      timestamp: new Date().toISOString(),
      data: { status, message: message ?? `Estado cambiado a ${status}` },
    });
  }

  emitTaskStart(taskId: string, func: AIFunction): void {
    this.broadcast({
      type: "task_start",
      timestamp: new Date().toISOString(),
      data: { taskId, function: func },
    });
  }

  emitTaskComplete(taskId: string, func: AIFunction, result: TaskResult): void {
    this.broadcast({
      type: "task_complete",
      timestamp: new Date().toISOString(),
      data: {
        taskId,
        function: func,
        success: result.success,
        itemsProcessed: result.itemsProcessed,
        itemsAffected: result.itemsAffected,
        duration: result.duration,
        details: result.details,
      },
    });
  }

  emitTaskError(taskId: string, func: AIFunction, error: string): void {
    this.broadcast({
      type: "task_error",
      timestamp: new Date().toISOString(),
      data: { taskId, function: func, error },
    });
  }

  emitModeChange(mode: AIMode): void {
    this.broadcast({
      type: "mode_change",
      timestamp: new Date().toISOString(),
      data: { mode, message: `Modo cambiado a ${mode}` },
    });
  }

  emitDecisionRequired(
    decisionId: string,
    func: AIFunction,
    description: string,
    impact: string
  ): void {
    this.broadcast({
      type: "decision_required",
      timestamp: new Date().toISOString(),
      data: { decisionId, function: func, description, impact },
    });
  }

  emitAlert(
    func: AIFunction,
    severity: string,
    title: string,
    message: string
  ): void {
    this.broadcast({
      type: "alert",
      timestamp: new Date().toISOString(),
      data: { function: func, severity, title, message },
    });
  }
}

// Singleton instance
export const aiEventBroadcaster = new AIEventBroadcaster();

// Export class for testing
export { AIEventBroadcaster };
