"use client";

import { useCallback, useEffect, useState } from "react";
import { Store } from "./types";

const STORAGE_KEY = "carpool-planer-store-v3";
const LEGACY_KEYS = ["carpool-planer-store-v1", "carpool-planer-store-v2"];

type LooseStore = Partial<Store>;

function normalize(value: LooseStore | null): Store | null {
  if (!value || typeof value !== "object") return null;
  const locations = Array.isArray(value.locations) ? value.locations : null;
  const parents = Array.isArray(value.parents) ? value.parents : null;
  const children = Array.isArray(value.children) ? value.children : null;
  const events = Array.isArray(value.events) ? value.events : null;
  if (!locations || !parents || !children || !events) return null;
  return {
    locations,
    parents,
    children,
    events,
    participations: Array.isArray(value.participations) ? value.participations : [],
    trips: Array.isArray(value.trips) ? value.trips : [],
    offers: Array.isArray(value.offers) ? value.offers : [],
  };
}

export function useStore() {
  const [store, setStore] = useState<Store | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      for (const key of LEGACY_KEYS) {
        window.localStorage.removeItem(key);
      }
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalize(JSON.parse(raw));
        if (parsed) {
          setStore(parsed);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      setStore(null);
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Store) => {
    setStore(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      for (const key of LEGACY_KEYS) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
    window.location.reload();
  }, []);

  return { store, persist, loaded, reset };
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
