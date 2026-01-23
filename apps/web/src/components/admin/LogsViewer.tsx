"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";

// Mock logs data
const mockLogs = [
  {
    id: "1",
    timestamp: "2024-01-23T14:32:45.123Z",
    level: "error",
    source: "api",
    message: "Failed to connect to database",
    details: "Error: ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect",
  },
  {
    id: "2",
    timestamp: "2024-01-23T14:32:44.890Z",
    level: "warning",
    source: "scraper",
    message: "Rate limit reached for Idealista",
    details: "Waiting 60 seconds before retry...",
  },
  {
    id: "3",
    timestamp: "2024-01-23T14:32:43.456Z",
    level: "info",
    source: "auth",
    message: "User logged in",
    details: "user_id: user_123, ip: 192.168.1.1, device: Chrome/Windows",
  },
  {
    id: "4",
    timestamp: "2024-01-23T14:32:42.234Z",
    level: "info",
    source: "api",
    message: "Search query processed",
    details: "query: piso 3 habitaciones barcelona, results: 24, time: 234ms",
  },
  {
    id: "5",
    timestamp: "2024-01-23T14:32:41.012Z",
    level: "debug",
    source: "ai",
    message: "Fraud detection completed",
    details: "listing_id: listing_456, score: 23%, flags: [suspicious_price, duplicate_images]",
  },
  {
    id: "6",
    timestamp: "2024-01-23T14:32:40.789Z",
    level: "info",
    source: "billing",
    message: "Subscription created",
    details: "user_id: user_789, plan: pro, amount: 9.99€",
  },
  {
    id: "7",
    timestamp: "2024-01-23T14:32:39.567Z",
    level: "warning",
    source: "scraper",
    message: "Missing image for listing",
    details: "listing_id: listing_789, url: https://example.com/image.jpg",
  },
  {
    id: "8",
    timestamp: "2024-01-23T14:32:38.345Z",
    level: "error",
    source: "api",
    message: "Unhandled exception in search handler",
    details: "TypeError: Cannot read property 'filter' of undefined\n    at SearchHandler.handle",
  },
  {
    id: "9",
    timestamp: "2024-01-23T14:32:37.123Z",
    level: "info",
    source: "scraper",
    message: "Scraping completed",
    details: "source: Fotocasa, new_listings: 45, updated: 123, time: 12.5s",
  },
  {
    id: "10",
    timestamp: "2024-01-23T14:32:36.901Z",
    level: "info",
    source: "ai",
    message: "Price analysis batch completed",
    details: "processed: 500, anomalies_detected: 12",
  },
];

interface LogsViewerProps {
  searchQuery: string;
  levelFilter: string;
  sourceFilter: string;
  autoRefresh: boolean;
}

export function LogsViewer({
  searchQuery,
  levelFilter,
  sourceFilter,
  autoRefresh,
}: LogsViewerProps) {
  const [expandedLogs, setExpandedLogs] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [logs, setLogs] = useState(mockLogs);

  // Simulate auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: ["info", "warning", "error", "debug"][Math.floor(Math.random() * 4)] as string,
        source: ["api", "scraper", "auth", "billing", "ai"][Math.floor(Math.random() * 5)] as string,
        message: "Auto-generated log entry",
        details: "This is a simulated log for auto-refresh demonstration",
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 100));
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesSource = sourceFilter === "all" || log.source === sourceFilter;
    return matchesSearch && matchesLevel && matchesSource;
  });

  const toggleExpand = (id: string) => {
    setExpandedLogs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const copyToClipboard = (log: typeof mockLogs[0]) => {
    const text = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}\n${log.details}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "debug":
        return <Bug className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants: Record<string, string> = {
      error: "bg-red-100 text-red-800 border-red-200",
      warning: "bg-amber-100 text-amber-800 border-amber-200",
      info: "bg-blue-100 text-blue-800 border-blue-200",
      debug: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return variants[level] || variants.info;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="divide-y">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron logs con los filtros aplicados
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 hover:bg-muted/50 transition-colors ${
                    log.level === "error" ? "bg-red-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs uppercase ${getLevelBadge(log.level)}`}
                        >
                          {log.level}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {log.source}
                        </Badge>
                      </div>
                      <p className="mt-1 font-medium text-sm">{log.message}</p>
                      {expandedLogs.includes(log.id) && (
                        <pre className="mt-2 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                          {log.details}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(log)}
                      >
                        {copiedId === log.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleExpand(log.id)}
                      >
                        {expandedLogs.includes(log.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
