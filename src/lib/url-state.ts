"use client";

import { useCallback, useSyncExternalStore } from "react";

// Booking steps live in the query string (?leistung=…&tag=…&zeit=…), so the browser's back button steps back
// and a reload keeps the place. Plain history API; the page is one static route.
export type StepState = { leistung?: string; tag?: string; zeit?: string; daten?: string };
const KEYS = ["leistung", "tag", "zeit", "daten"] as const;

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

const getSnapshot = () => window.location.search;
const getServerSnapshot = () => "";

export function useStepState() {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const params = new URLSearchParams(search);
  const state: StepState = {};
  for (const key of KEYS) {
    const value = params.get(key);
    if (value) state[key] = value;
  }

  // push: new history entry (a step forward); replace: correct the current one (e.g. invalid value)
  const go = useCallback((next: StepState, mode: "push" | "replace" = "push") => {
    const url = new URL(window.location.href);
    for (const key of KEYS) {
      if (next[key]) url.searchParams.set(key, next[key]!);
      else url.searchParams.delete(key);
    }
    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
    listeners.forEach((l) => l());
  }, []);

  return [state, go] as const;
}

// Where the visitor came from (?src=qr on the QR code). Kept for the session, sent with config and booking.
export function visitSource() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("src");
    if (fromUrl && /^[a-z0-9_-]{1,24}$/.test(fromUrl)) sessionStorage.setItem("src", fromUrl);
    return sessionStorage.getItem("src") ?? "direct";
  } catch {
    return "direct";
  }
}
