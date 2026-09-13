import { useCallback, useRef, useSyncExternalStore } from 'react';

export type Listener = () => void;

export interface Store<T> {
  getState: () => T;
  setState: (update: T | ((prev: T) => T)) => void;
  patch: (partial: Partial<T>) => void;
  subscribe: (listener: Listener) => () => void;
}

/**
 * Client-shared store. Survives App Router soft navigation because it lives
 * in the module instance, not in a page component.
 */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();

  const getState = () => state;

  const setState = (update: T | ((prev: T) => T)) => {
    const next = typeof update === 'function' ? (update as (prev: T) => T)(state) : update;
    if (Object.is(next, state)) {
      return;
    }
    state = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getState,
    setState,
    patch: (partial) => setState((prev) => ({ ...prev, ...partial })),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStore<T>(store: Store<T>): T;
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S;
export function useStore<T, S>(store: Store<T>, selector?: (state: T) => S): T | S {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const snapshot = useCallback(() => {
    const state = store.getState();
    return selectorRef.current ? selectorRef.current(state) : state;
  }, [store]);
  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
