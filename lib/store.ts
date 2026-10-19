import { Store } from "./types";
import { seedStore } from "./seed";

let store: Store | null = null;

export function getStore(): Store {
  if (!store) {
    store = seedStore();
  }
  return store;
}

export function updateStore(fn: (s: Store) => void): Store {
  const s = getStore();
  fn(s);
  return s;
}

export function resetStore(): Store {
  store = seedStore();
  return store;
}
