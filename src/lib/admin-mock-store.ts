"use client";

import { useSyncExternalStore } from "react";

import {
  INITIAL_ADMIN_STATE,
  type MockAdminState,
} from "@/lib/admin-mock";

const STORAGE_KEY = "tueats-phase1-admin";
const listeners = new Set<() => void>();
let state = INITIAL_ADMIN_STATE;
let hydrated = false;

function emit() {
  for (const listener of listeners) listener();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) state = JSON.parse(saved) as MockAdminState;
  } catch {
    state = INITIAL_ADMIN_STATE;
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL_ADMIN_STATE;
}

export function updateMockAdminState(
  update: (current: MockAdminState) => MockAdminState,
) {
  state = update(state);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  emit();
}

export function resetMockAdminState() {
  state = INITIAL_ADMIN_STATE;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

export function useMockAdminState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
