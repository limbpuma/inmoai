/**
 * useAIEvents - Hook for subscribing to AI system events
 * Provides filtered event streams and real-time event listening
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAdminAIStore } from '@/stores/adminAIStore';
import type { AIEvent, AIFunction } from '@/types/adminAI';

type EventCallback = (event: AIEvent) => void;

interface UseAIEventsOptions {
  /** Filter events by function */
  functionFilter?: AIFunction;
  /** Filter events by type */
  typeFilter?: AIEvent['type'];
  /** Filter events by severity */
  severityFilter?: AIEvent['severity'];
  /** Max number of events to return */
  limit?: number;
  /** Callback when a new event arrives */
  onEvent?: EventCallback;
}

export function useAIEvents(options: UseAIEventsOptions = {}) {
  const {
    functionFilter,
    typeFilter,
    severityFilter,
    limit = 50,
    onEvent,
  } = options;

  const events = useAdminAIStore((s) => s.events);
  const addEvent = useAdminAIStore((s) => s.addEvent);
  const previousLengthRef = useRef(events.length);

  // Notify on new events
  useEffect(() => {
    if (onEvent && events.length > previousLengthRef.current) {
      const newCount = events.length - previousLengthRef.current;
      // Events are prepended (newest first), so slice from the start
      const newEvents = events.slice(0, newCount);
      for (const event of newEvents) {
        onEvent(event);
      }
    }
    previousLengthRef.current = events.length;
  }, [events, onEvent]);

  const filteredEvents = useMemo(() => {
    let result = events;

    if (functionFilter) {
      result = result.filter((e) => e.function === functionFilter);
    }
    if (typeFilter) {
      result = result.filter((e) => e.type === typeFilter);
    }
    if (severityFilter) {
      result = result.filter((e) => e.severity === severityFilter);
    }

    return result.slice(0, limit);
  }, [events, functionFilter, typeFilter, severityFilter, limit]);

  const errorEvents = useMemo(
    () => events.filter((e) => e.severity === 'error'),
    [events]
  );

  const recentEvents = useMemo(() => events.slice(0, 10), [events]);

  const getEventsByFunction = useCallback(
    (func: AIFunction) => events.filter((e) => e.function === func),
    [events]
  );

  const emitEvent = useCallback(
    (event: Omit<AIEvent, 'id' | 'timestamp'>) => {
      addEvent(event);
    },
    [addEvent]
  );

  return {
    events: filteredEvents,
    allEvents: events,
    errorEvents,
    recentEvents,
    totalCount: events.length,
    filteredCount: filteredEvents.length,
    getEventsByFunction,
    emitEvent,
  };
}
