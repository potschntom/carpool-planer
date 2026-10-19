"use client";

import { useCallback, useEffect, useState } from "react";
import { Store } from "./types";

const STORAGE_KEY = "carpool-planer-store-v2";
const LEGACY_KEY = "carpool-planer-store-v1";

function isValidStore(value: any): value is Store {
  return (
    value &&
    Array.isArray(value.locations) &&
    Array.isArray(value.parents) &&
    Array.isArray(value.children) &&
    Array.isArray(value.events) &&
    Array.isArray(value.participations) &&
    Array.isArray(value.trips)
  );
}

export function useStore() {
  const [store, setStore] = useState<Store | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_KEY);
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidStore(parsed)) {
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
      window.localStorage.removeItem(LEGACY_KEY);
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
