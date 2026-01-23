"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIEvent, AIFunction } from "@/types/adminAI";

type EventFilter = {
  types?: AIEvent["type"][];
  functions?: AIFunction[];
  severities?: AIEvent["severity"][];
  since?: Date;
};

/**
 * Hook for subscribing to and filtering AI events
 * Provides real-time event monitoring capabilities
 */
export function useAIEvents(filter?: EventFilter) {
  const { events, addEvent } = useAdminAIStore();
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  // Filter events based on criteria
  const filteredEvents = useMemo(() => {
    if (!filter) return events;

    return events.filter((event) => {
      if (filter.types && !filter.types.includes(event.type)) {
        return false;
      }
      if (filter.functions && !filter.functions.includes(event.function)) {
        return false;
      }
      if (filter.severities && !filter.severities.includes(event.severity)) {
        return false;
      }
      if (filter.since && new Date(event.timestamp) < filter.since) {
        return false;
      }
      return true;
    });
  }, [events, filter]);

  // Get the latest event
  const latestEvent = useMemo(() => {
    return filteredEvents[0] || null;
  }, [filteredEvents]);

  // Check if there are new events since last check
  const hasNewEvents = useMemo(() => {
    if (!lastEventId) return filteredEvents.length > 0;
    return filteredEvents.length > 0 && filteredEvents[0].id !== lastEventId;
  }, [filteredEvents, lastEventId]);

  // Mark events as seen
  const markAsSeen = useCallback(() => {
    if (filteredEvents.length > 0) {
      setLastEventId(filteredEvents[0].id);
    }
  }, [filteredEvents]);

  // Get events grouped by function
  const eventsByFunction = useMemo(() => {
    const grouped: Record<AIFunction, AIEvent[]> = {} as Record<AIFunction, AIEvent[]>;
    filteredEvents.forEach((event) => {
      if (!grouped[event.function]) {
        grouped[event.function] = [];
      }
      grouped[event.function].push(event);
    });
    return grouped;
  }, [filteredEvents]);

  // Get events grouped by type
  const eventsByType = useMemo(() => {
    const grouped: Record<AIEvent["type"], AIEvent[]> = {} as Record<AIEvent["type"], AIEvent[]>;
    filteredEvents.forEach((event) => {
      if (!grouped[event.type]) {
        grouped[event.type] = [];
      }
      grouped[event.type].push(event);
    });
    return grouped;
  }, [filteredEvents]);

  // Get event counts by severity
  const severityCounts = useMemo(() => {
    return {
      info: filteredEvents.filter((e) => e.severity === "info").length,
      warning: filteredEvents.filter((e) => e.severity === "warning").length,
      error: filteredEvents.filter((e) => e.severity === "error").length,
      success: filteredEvents.filter((e) => e.severity === "success").length,
    };
  }, [filteredEvents]);

  // Helper to emit custom events
  const emitEvent = useCallback(
    (event: Omit<AIEvent, "id" | "timestamp">) => {
      addEvent(event);
    },
    [addEvent]
  );

  return {
    events: filteredEvents,
    latestEvent,
    hasNewEvents,
    eventsByFunction,
    eventsByType,
    severityCounts,
    totalEvents: filteredEvents.length,
    markAsSeen,
    emitEvent,
  };
}

/**
 * Hook for real-time event notifications
 * Shows toast/notifications when new events occur
 */
export function useAIEventNotifications(options?: {
  enabled?: boolean;
  severities?: AIEvent["severity"][];
  onEvent?: (event: AIEvent) => void;
}) {
  const { events } = useAdminAIStore();
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

  const enabled = options?.enabled ?? true;
  const severities = options?.severities ?? ["error", "warning"];

  useEffect(() => {
    if (!enabled || events.length === 0) return;

    const latestEvent = events[0];

    // Skip if we've already notified about this event
    if (lastNotifiedId === latestEvent.id) return;

    // Check if this event should trigger a notification
    if (severities.includes(latestEvent.severity)) {
      setLastNotifiedId(latestEvent.id);

      // Call the callback if provided
      if (options?.onEvent) {
        options.onEvent(latestEvent);
      }
    }
  }, [events, enabled, severities, lastNotifiedId, options]);

  return {
    lastNotifiedEvent: events.find((e) => e.id === lastNotifiedId) || null,
  };
}
