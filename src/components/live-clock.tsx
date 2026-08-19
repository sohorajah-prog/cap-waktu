"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared second-ticker for the whole app, exposed as an external store so
 * the server renders a placeholder and the client takes over after hydration.
 */
let current = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (timer === null) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((listener) => listener());
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => current;
const getStopped = () => 0;
const noop = () => () => {};

/** Current time, re-rendering once a second. Null until the client takes over. */
export function useNow(active = true): Date | null {
  const ms = useSyncExternalStore(
    active ? subscribe : noop,
    active ? getSnapshot : getStopped,
    getStopped,
  );
  return ms === 0 ? null : new Date(ms);
}
