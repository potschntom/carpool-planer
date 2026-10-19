"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "carpool-planer-store-v1";

export function useStore() {
  const [store, setStore] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setStore(JSON.parse(raw));
      } catch {
        setStore(null);
      }
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((next: any) => {
    setStore(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);

  return { store, persist, loaded, reset };
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
