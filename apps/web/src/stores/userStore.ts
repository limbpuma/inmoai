import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  authenticityScore: number;
  savedAt: string;
  source: string;
  image?: string;
  url?: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters: {
    city?: string;
    type?: string;
    bedrooms?: number;
    priceMin?: number;
    priceMax?: number;
    hasGarden?: boolean;
    hasPool?: boolean;
    neighborhood?: string;
  };
  results: number;
  timestamp: string;
}

export interface Alert {
  id: string;
  name: string;
  query: string;
  filters: SearchHistoryItem["filters"];
  isActive: boolean;
  frequency: "instant" | "daily" | "weekly";
  createdAt: string;
  lastTriggered?: string;
}

export interface NotificationSettings {
  email: boolean;
  newListings: boolean;
  priceDrops: boolean;
  weeklyDigest: boolean;
}

interface UserState {
  // Saved properties (favorites)
  favorites: SavedProperty[];
  addFavorite: (property: SavedProperty) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  // Search history
  searchHistory: SearchHistoryItem[];
  addToHistory: (item: Omit<SearchHistoryItem, "id" | "timestamp">) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;

  // Alerts
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, "id" | "createdAt">) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;

  // Notification settings
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;

  // Recent searches (for quick access)
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Favorites
      favorites: [],
      addFavorite: (property) =>
        set((state) => ({
          favorites: [
            { ...property, savedAt: new Date().toISOString() },
            ...state.favorites,
          ],
        })),
      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        })),
      isFavorite: (id) => get().favorites.some((f) => f.id === id),

      // Search history
      searchHistory: [],
      addToHistory: (item) =>
        set((state) => ({
          searchHistory: [
            {
              ...item,
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            },
            ...state.searchHistory.slice(0, 99), // Keep last 100
          ],
        })),
      removeFromHistory: (id) =>
        set((state) => ({
          searchHistory: state.searchHistory.filter((h) => h.id !== id),
        })),
      clearHistory: () => set({ searchHistory: [] }),

      // Alerts
      alerts: [],
      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            {
              ...alert,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
            ...state.alerts,
          ],
        })),
      updateAlert: (id, updates) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),
      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, isActive: !a.isActive } : a
          ),
        })),

      // Notification settings
      notificationSettings: {
        email: true,
        newListings: true,
        priceDrops: true,
        weeklyDigest: false,
      },
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            ...settings,
          },
        })),

      // Recent searches
      recentSearches: [],
      addRecentSearch: (query) =>
        set((state) => {
          const filtered = state.recentSearches.filter((q) => q !== query);
          return {
            recentSearches: [query, ...filtered].slice(0, 10),
          };
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "inmoai-user-store",
      partialize: (state) => ({
        favorites: state.favorites,
        searchHistory: state.searchHistory,
        alerts: state.alerts,
        notificationSettings: state.notificationSettings,
        recentSearches: state.recentSearches,
      }),
    }
  )
);
