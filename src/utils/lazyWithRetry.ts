import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const CHUNK_RELOAD_STORAGE_KEY = "quizapp_chunk_reload_at";
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

const CHUNK_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "importing a module script failed",
  "error loading dynamically imported module",
  "loading chunk",
  "chunkloaderror",
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";

  const combined = `${name} ${message}`.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => combined.includes(pattern));
}

export function attemptChunkRecoveryReload(
  error?: unknown,
  reloadFn?: () => void,
): boolean {
  if (error !== undefined && !isChunkLoadError(error)) {
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }

  const now = Date.now();
  try {
    const rawLastReload = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    const lastReloadAt = rawLastReload ? Number(rawLastReload) : 0;
    if (Number.isFinite(lastReloadAt) && lastReloadAt > 0 && now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
  } catch {
    // Ignore storage access errors in restricted privacy modes
  }

  if (reloadFn) {
    reloadFn();
  } else {
    window.location.reload();
  }
  return true;
}

export interface LoadWithRetryOptions {
  retryDelayMs?: number;
  reloadFn?: () => void;
  hangAfterReload?: boolean;
}

export async function loadWithRetry<P>(
  importer: () => Promise<{ default: ComponentType<P> }>,
  options: LoadWithRetryOptions = {},
): Promise<{ default: ComponentType<P> }> {
  const { retryDelayMs = 250, reloadFn, hangAfterReload = true } = options;

  try {
    return await importer();
  } catch (firstError) {
    if (!isChunkLoadError(firstError)) {
      throw firstError;
    }

    if (retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }

    try {
      return await importer();
    } catch (secondError) {
      if (isChunkLoadError(secondError)) {
        let didReload = false;
        try {
          didReload = attemptChunkRecoveryReload(secondError, reloadFn);
        } catch {
          didReload = false;
        }
        if (didReload && hangAfterReload) {
          return new Promise<{ default: ComponentType<P> }>(() => {});
        }
      }
      throw secondError;
    }
  }
}

export function lazyWithRetry<P = Record<string, never>>(
  importer: () => Promise<{ default: ComponentType<P> }>,
): LazyExoticComponent<ComponentType<P>> {
  return lazy(() => loadWithRetry(importer));
}
