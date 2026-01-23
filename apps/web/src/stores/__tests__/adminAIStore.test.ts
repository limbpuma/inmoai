/**
 * Admin AI Store Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAdminAIStore } from "../adminAIStore";

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: () => "test-uuid-" + Math.random().toString(36).slice(2),
});

describe("AdminAIStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useAdminAIStore.getState();
    store.setMode("lazy");
    store.clearAlerts();
  });

  describe("Mode Management", () => {
    it("should initialize with lazy mode", () => {
      const { config } = useAdminAIStore.getState();
      expect(config.mode).toBe("lazy");
    });

    it("should change mode correctly", () => {
      const store = useAdminAIStore.getState();
      store.setMode("active");
      expect(useAdminAIStore.getState().config.mode).toBe("active");

      store.setMode("autonomous");
      expect(useAdminAIStore.getState().config.mode).toBe("autonomous");
    });

    it("should add event when mode changes", () => {
      const store = useAdminAIStore.getState();
      const initialEventsCount = store.events.length;

      store.setMode("active");

      const events = useAdminAIStore.getState().events;
      expect(events.length).toBeGreaterThan(initialEventsCount);
      expect(events[0].message).toContain("ACTIVE");
    });
  });

  describe("Function Management", () => {
    it("should enable/disable functions", () => {
      const store = useAdminAIStore.getState();

      store.setFunctionEnabled("moderation", true);
      expect(useAdminAIStore.getState().config.functions.moderation.enabled).toBe(true);

      store.setFunctionEnabled("moderation", false);
      expect(useAdminAIStore.getState().config.functions.moderation.enabled).toBe(false);
    });

    it("should set function mode independently", () => {
      const store = useAdminAIStore.getState();

      store.setFunctionMode("scraping", "active");
      expect(useAdminAIStore.getState().config.functions.scraping.mode).toBe("active");

      // Global mode should not change
      expect(useAdminAIStore.getState().config.mode).toBe("lazy");
    });
  });

  describe("Pause/Resume", () => {
    it("should pause the system", () => {
      const store = useAdminAIStore.getState();
      store.pause();
      expect(useAdminAIStore.getState().status).toBe("paused");
    });

    it("should resume the system", () => {
      const store = useAdminAIStore.getState();
      store.pause();
      store.resume();
      expect(useAdminAIStore.getState().status).toBe("idle");
    });
  });

  describe("Alerts", () => {
    it("should add alerts", () => {
      const store = useAdminAIStore.getState();
      const initialAlertsCount = store.alerts.length;

      store.addAlert({
        function: "scraping",
        severity: "warning",
        title: "Test Alert",
        message: "This is a test alert",
      });

      const alerts = useAdminAIStore.getState().alerts;
      expect(alerts.length).toBe(initialAlertsCount + 1);
      expect(alerts[0].title).toBe("Test Alert");
      expect(alerts[0].acknowledged).toBe(false);
    });

    it("should acknowledge alerts", () => {
      const store = useAdminAIStore.getState();

      store.addAlert({
        function: "scraping",
        severity: "error",
        title: "Error Alert",
        message: "Something went wrong",
      });

      const alertId = useAdminAIStore.getState().alerts[0].id;
      store.acknowledgeAlert(alertId);

      const alert = useAdminAIStore.getState().alerts.find((a) => a.id === alertId);
      expect(alert?.acknowledged).toBe(true);
    });

    it("should clear all alerts", () => {
      const store = useAdminAIStore.getState();

      store.addAlert({
        function: "scraping",
        severity: "info",
        title: "Alert 1",
        message: "Message 1",
      });
      store.addAlert({
        function: "fraud_detection",
        severity: "warning",
        title: "Alert 2",
        message: "Message 2",
      });

      store.clearAlerts();

      const alerts = useAdminAIStore.getState().alerts;
      expect(alerts.every((a) => a.acknowledged)).toBe(true);
    });
  });

  describe("Decisions", () => {
    it("should add pending decisions", () => {
      const store = useAdminAIStore.getState();

      store.addDecision({
        function: "scraping",
        action: "Delete listing",
        description: "Listing contains spam",
        impact: "medium",
        expiresAt: new Date(Date.now() + 3600000),
      });

      const decisions = useAdminAIStore.getState().pendingDecisions;
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].status).toBe("pending");
    });

    it("should approve decisions", () => {
      const store = useAdminAIStore.getState();

      store.addDecision({
        function: "fraud_detection",
        action: "Flag user",
        description: "Suspicious activity",
        impact: "high",
        expiresAt: new Date(Date.now() + 3600000),
      });

      const decisionId = useAdminAIStore.getState().pendingDecisions[0].id;
      store.approveDecision(decisionId);

      const decision = useAdminAIStore.getState().pendingDecisions.find(
        (d) => d.id === decisionId
      );
      expect(decision?.status).toBe("approved");
    });

    it("should reject decisions", () => {
      const store = useAdminAIStore.getState();

      store.addDecision({
        function: "moderation",
        action: "Remove content",
        description: "Content violation",
        impact: "low",
        expiresAt: new Date(Date.now() + 3600000),
      });

      const decisionId = useAdminAIStore.getState().pendingDecisions[0].id;
      store.rejectDecision(decisionId);

      const decision = useAdminAIStore.getState().pendingDecisions.find(
        (d) => d.id === decisionId
      );
      expect(decision?.status).toBe("rejected");
    });
  });

  describe("Events", () => {
    it("should add events", () => {
      const store = useAdminAIStore.getState();

      store.addEvent({
        type: "start",
        function: "scraping",
        message: "Starting scraping task",
        severity: "info",
      });

      const events = useAdminAIStore.getState().events;
      expect(events[0].message).toBe("Starting scraping task");
      expect(events[0].type).toBe("start");
    });

    it("should limit events to 200", () => {
      const store = useAdminAIStore.getState();

      // Add more than 200 events
      for (let i = 0; i < 250; i++) {
        store.addEvent({
          type: "complete",
          function: "scraping",
          message: `Event ${i}`,
          severity: "success",
        });
      }

      const events = useAdminAIStore.getState().events;
      expect(events.length).toBeLessThanOrEqual(200);
    });
  });

  describe("Metrics", () => {
    it("should track metrics", () => {
      const { metrics } = useAdminAIStore.getState();

      expect(metrics).toHaveProperty("actionsToday");
      expect(metrics).toHaveProperty("actionsThisWeek");
      expect(metrics).toHaveProperty("successRate");
      expect(metrics).toHaveProperty("pendingDecisions");
      expect(metrics).toHaveProperty("activeAlerts");
    });
  });
});
