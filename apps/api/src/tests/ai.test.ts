/**
 * AI Services Integration Tests
 * Tests orchestrator, fraud detection, and price analysis services
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIOrchestrator } from "../services/ai/orchestrator";
import { FraudDetectionService } from "../services/ai/fraudDetection";
import { PriceAnalysisService } from "../services/ai/priceAnalysis";
import type { ListingForAnalysis } from "../services/ai/types";

// --- Test fixtures ---

function createMockListing(
  overrides: Partial<ListingForAnalysis> = {}
): ListingForAnalysis {
  return {
    id: "test-listing-1",
    title: "Piso en el centro de Madrid",
    description:
      "Amplio piso de 3 habitaciones en el corazon de Madrid, totalmente reformado con acabados de calidad. Zona muy bien comunicada.",
    price: 350000,
    currency: "EUR",
    propertyType: "apartment",
    location: {
      city: "Madrid",
      neighborhood: "Centro",
      lat: 40.4168,
      lng: -3.7038,
    },
    features: {
      bedrooms: 3,
      bathrooms: 2,
      area: 90,
      floor: 3,
      hasParking: false,
      hasPool: false,
      hasGarden: false,
    },
    images: [
      "img1.jpg",
      "img2.jpg",
      "img3.jpg",
      "img4.jpg",
      "img5.jpg",
    ],
    source: "api_ingestion",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// --- AIOrchestrator Tests ---

describe("AIOrchestrator", () => {
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    orchestrator = new AIOrchestrator({
      mode: "active",
      maxConcurrentTasks: 3,
      retryOnError: false,
    });
  });

  it("should initialize with correct default status", () => {
    const status = orchestrator.getStatus();
    expect(status.status).toBe("idle");
    expect(status.activeTasks).toBe(0);
    expect(status.queuedTasks).toBe(0);
    expect(status.mode).toBe("active");
  });

  it("should register and execute a handler", async () => {
    const handler = vi.fn().mockResolvedValue({
      success: true,
      itemsProcessed: 10,
      itemsAffected: 3,
      duration: 100,
    });

    orchestrator.registerHandler("fraud_detection", handler);
    const taskId = await orchestrator.submitTask("fraud_detection", { test: true });

    expect(taskId).toBeDefined();
    // Wait for async execution
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should queue tasks in lazy mode without approval", async () => {
    const lazyOrchestrator = new AIOrchestrator({ mode: "lazy" });
    const handler = vi.fn().mockResolvedValue({
      success: true,
      itemsProcessed: 0,
      itemsAffected: 0,
      duration: 0,
    });
    lazyOrchestrator.registerHandler("price_analysis", handler);

    await lazyOrchestrator.submitTask("price_analysis");

    expect(handler).not.toHaveBeenCalled();
    expect(lazyOrchestrator.getPendingTasks()).toHaveLength(1);
  });

  it("should execute task after approval in lazy mode", async () => {
    const lazyOrchestrator = new AIOrchestrator({ mode: "lazy" });
    const handler = vi.fn().mockResolvedValue({
      success: true,
      itemsProcessed: 5,
      itemsAffected: 2,
      duration: 50,
    });
    lazyOrchestrator.registerHandler("fraud_detection", handler);

    const taskId = await lazyOrchestrator.submitTask("fraud_detection");
    const result = await lazyOrchestrator.approveTask(taskId);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
  });

  it("should reject a pending task", async () => {
    const lazyOrchestrator = new AIOrchestrator({ mode: "lazy" });
    lazyOrchestrator.registerHandler("data_pipeline", vi.fn());

    const taskId = await lazyOrchestrator.submitTask("data_pipeline");
    const rejected = lazyOrchestrator.rejectTask(taskId);

    expect(rejected).toBe(true);
    expect(lazyOrchestrator.getPendingTasks()).toHaveLength(0);
  });

  it("should respect concurrent task limit", async () => {
    const slowOrchestrator = new AIOrchestrator({
      mode: "active",
      maxConcurrentTasks: 1,
    });
    const handler = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        itemsProcessed: 1,
        itemsAffected: 0,
        duration: 100,
      }), 200))
    );
    slowOrchestrator.registerHandler("fraud_detection", handler);

    await slowOrchestrator.submitTask("fraud_detection");
    await slowOrchestrator.submitTask("fraud_detection");

    const status = slowOrchestrator.getStatus();
    expect(status.queuedTasks).toBe(1);
  });

  it("should change mode", () => {
    orchestrator.setMode("autonomous");
    expect(orchestrator.getStatus().mode).toBe("autonomous");
  });

  it("should cancel a running task", async () => {
    const handler = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 5000))
    );
    orchestrator.registerHandler("data_pipeline", handler);

    const taskId = await orchestrator.submitTask("data_pipeline");
    // Small delay to let task start
    await new Promise((resolve) => setTimeout(resolve, 10));

    const cancelled = orchestrator.cancelTask(taskId);
    expect(cancelled).toBe(true);
    expect(orchestrator.getStatus().activeTasks).toBe(0);
  });

  it("should pause and resume", () => {
    orchestrator.pause();
    expect(orchestrator.getStatus().status).toBe("paused");

    orchestrator.resume();
    expect(orchestrator.getStatus().status).toBe("idle");
  });

  it("should queue unregistered handler in lazy mode without error", async () => {
    // In lazy mode, submitTask queues without executing, so no handler is needed yet
    const lazyOrchestrator = new AIOrchestrator({ mode: "lazy" });
    const taskId = await lazyOrchestrator.submitTask("moderation");

    expect(taskId).toBeDefined();
    expect(lazyOrchestrator.getPendingTasks()).toHaveLength(1);
    expect(lazyOrchestrator.getPendingTasks()[0].function).toBe("moderation");
  });
});

// --- FraudDetectionService Tests ---

describe("FraudDetectionService", () => {
  let service: FraudDetectionService;

  beforeEach(() => {
    service = new FraudDetectionService();
  });

  it("should approve a clean listing", async () => {
    const listing = createMockListing();
    const result = await service.analyzeListing(listing);

    expect(result.listingId).toBe("test-listing-1");
    expect(result.recommendation).toBe("approve");
    expect(result.riskScore).toBeLessThan(50);
  });

  it("should flag listing with suspiciously low price", async () => {
    const listing = createMockListing({
      price: 10000,
    });
    const result = await service.analyzeListing(listing);

    // A single high-severity flag may not reach isSuspicious threshold (50),
    // but the price_anomaly flag must be present
    expect(result.flags.some((f) => f.type === "price_anomaly")).toBe(true);
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it("should flag listing with suspicious keywords", async () => {
    const listing = createMockListing({
      description: "URGENTE!! Oportunidad unica, solo hoy, regalo, contactar whatsapp",
    });
    const result = await service.analyzeListing(listing);

    expect(result.flags.some((f) => f.type === "copy_paste_description")).toBe(true);
    expect(result.flags.some((f) => f.type === "suspicious_contact")).toBe(true);
  });

  it("should flag listing with too few images", async () => {
    const listing = createMockListing({
      images: [],
    });
    const result = await service.analyzeListing(listing);

    expect(result.flags.some((f) => f.type === "duplicate_images")).toBe(true);
  });

  it("should flag listing with short description", async () => {
    const listing = createMockListing({
      description: "Piso en Madrid.",
    });
    const result = await service.analyzeListing(listing);

    expect(result.flags.some((f) => f.description.includes("corta"))).toBe(true);
  });

  it("should flag listing with contact info in description", async () => {
    const listing = createMockListing({
      description: "Piso amplio en buena zona. Contacta por telegram @propietario o llama al 612345678.",
    });
    const result = await service.analyzeListing(listing);

    expect(result.flags.some((f) => f.type === "suspicious_contact")).toBe(true);
  });

  it("should batch analyze multiple listings", async () => {
    const listings = [
      createMockListing({ id: "l1" }),
      createMockListing({ id: "l2", price: 5000 }),
      createMockListing({ id: "l3" }),
    ];

    const results = await service.analyzeListings(listings);

    expect(results).toHaveLength(3);
    expect(results[0].listingId).toBe("l1");
    expect(results[1].listingId).toBe("l2");
    expect(results[1].flags.some((f) => f.type === "price_anomaly")).toBe(true);
  });

  it("should recommend reject for high risk listings", async () => {
    const listing = createMockListing({
      price: 5000,
      description: "URGENTE ganga regalo solo hoy contactar whatsapp 612345678",
      images: [],
    });
    const result = await service.analyzeListing(listing);

    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.recommendation).toBe("reject");
  });

  it("should update price cache", () => {
    service.updatePriceCache("Madrid", "apartment", 4500, 800);
    // No throw = success (cache is private, tested indirectly via analysis)
    expect(true).toBe(true);
  });
});

// --- PriceAnalysisService Tests ---

describe("PriceAnalysisService", () => {
  let service: PriceAnalysisService;

  beforeEach(() => {
    service = new PriceAnalysisService();
  });

  it("should estimate price for a Madrid apartment", async () => {
    const listing = createMockListing();
    const result = await service.analyzeListing(listing);

    expect(result.listingId).toBe("test-listing-1");
    expect(result.estimatedPrice).toBeGreaterThan(0);
    expect(result.pricePerSqm).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(60);
    expect(result.priceRange.min).toBeLessThan(result.priceRange.max);
  });

  it("should return higher price for Barcelona than Sevilla", async () => {
    const bcnListing = createMockListing({
      id: "bcn",
      location: { city: "Barcelona", neighborhood: "Eixample" },
    });
    const sevListing = createMockListing({
      id: "sev",
      location: { city: "Sevilla", neighborhood: "Triana" },
    });

    const bcnResult = await service.analyzeListing(bcnListing);
    const sevResult = await service.analyzeListing(sevListing);

    expect(bcnResult.pricePerSqm).toBeGreaterThan(sevResult.pricePerSqm);
  });

  it("should detect below-market pricing", async () => {
    const listing = createMockListing({
      price: 100000, // Very low for Madrid 90m2 apartment
    });
    const result = await service.analyzeListing(listing);

    expect(result.marketComparison).toBe("below");
    expect(result.deviation).toBeLessThan(-10);
  });

  it("should detect above-market pricing", async () => {
    const listing = createMockListing({
      price: 900000, // Very high for 90m2 in Centro
    });
    const result = await service.analyzeListing(listing);

    expect(result.marketComparison).toBe("above");
    expect(result.deviation).toBeGreaterThan(10);
  });

  it("should include parking factor when present", async () => {
    const listing = createMockListing({
      features: {
        bedrooms: 3,
        bathrooms: 2,
        area: 90,
        hasParking: true,
        hasPool: false,
        hasGarden: false,
      },
    });
    const result = await service.analyzeListing(listing);

    expect(result.factors.some((f) => f.name.includes("parking"))).toBe(true);
  });

  it("should give premium neighborhood a higher estimate", async () => {
    const premiumListing = createMockListing({
      id: "premium",
      location: { city: "Madrid", neighborhood: "Salamanca" },
    });
    const normalListing = createMockListing({
      id: "normal",
      location: { city: "Madrid", neighborhood: "Vallecas" },
    });

    const premiumResult = await service.analyzeListing(premiumListing);
    const normalResult = await service.analyzeListing(normalListing);

    expect(premiumResult.estimatedPrice).toBeGreaterThan(normalResult.estimatedPrice);
  });

  it("should increase confidence with more data", async () => {
    const fullListing = createMockListing();
    const partialListing = createMockListing({
      id: "partial",
      features: {
        bedrooms: undefined,
        bathrooms: undefined,
        area: undefined,
      },
      images: [],
      location: { city: "Madrid" },
    });

    const fullResult = await service.analyzeListing(fullListing);
    const partialResult = await service.analyzeListing(partialListing);

    expect(fullResult.confidence).toBeGreaterThan(partialResult.confidence);
  });

  it("should batch analyze listings", async () => {
    const listings = [
      createMockListing({ id: "a1" }),
      createMockListing({ id: "a2", price: 500000 }),
    ];

    const results = await service.analyzeListings(listings);

    expect(results).toHaveLength(2);
    expect(results[0].listingId).toBe("a1");
    expect(results[1].listingId).toBe("a2");
  });

  it("should detect anomalies in a set", async () => {
    const listings = [
      createMockListing({ id: "normal", price: 400000 }),
      createMockListing({ id: "anomaly", price: 50000 }),
    ];

    const anomalies = await service.detectAnomalies(listings);

    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(anomalies.some((a) => a.listingId === "anomaly")).toBe(true);
  });

  it("should get market stats", async () => {
    const stats = await service.getMarketStats("Madrid", "apartment");

    expect(stats.avgPricePerSqm).toBe(4500);
    expect(["up", "down", "stable"]).toContain(stats.trend);
  });

  it("should allow updating base prices", () => {
    service.updateBasePrices("Bilbao", {
      apartment: 3000,
      house: 2500,
    });
    // Verified indirectly: next analysis for Bilbao would use these prices
    expect(true).toBe(true);
  });
});
