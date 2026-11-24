import { useCallback, useEffect, useState } from "react";
import {
  detectInstallEnvironment,
  isInstallBannerDismissed,
  PWA_DISMISS_STORAGE_KEY,
  serializeInstallDismissal,
  type InstallEnvironment,
} from "../domain/pwaInstall";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

type PromptListener = (event: BeforeInstallPromptEvent | null) => void;

let capturedPrompt: BeforeInstallPromptEvent | null = null;
let listenersInitialized = false;
const promptListeners = new Set<PromptListener>();

function notifyPromptListeners() {
  for (const listener of promptListeners) {
    listener(capturedPrompt);
  }
}

/**
 * Registers global listeners as early as possible (in main.jsx) so the
 * browser's `beforeinstallprompt` event is never missed before components mount.
 */
export function initPwaInstallCapture(): void {
  if (typeof window === "undefined" || listenersInitialized) return;
  listenersInitialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    capturedPrompt = event as BeforeInstallPromptEvent;
    notifyPromptListeners();
  });

  window.addEventListener("appinstalled", () => {
    capturedPrompt = null;
    notifyPromptListeners();
  });
}

/**
 * Registers the minimal pass-through service worker for PWA installability.
 */
export function registerPwaServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const isSecureContext =
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (!isSecureContext) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Service worker registration is progressive enhancement; ignore errors silently.
    });
  });
}

function readBrowserEnvironment(): InstallEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return detectInstallEnvironment({ userAgent: "" });
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  const matchMediaStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;

  return detectInstallEnvironment({
    userAgent: navigator.userAgent || "",
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    matchMediaStandalone,
    navigatorStandalone: Boolean(nav.standalone),
  });
}

function readDismissedFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return isInstallBannerDismissed(window.localStorage.getItem(PWA_DISMISS_STORAGE_KEY));
  } catch {
    return false;
  }
}

export interface UsePwaInstallResult extends InstallEnvironment {
  canNativeInstall: boolean;
  isDismissed: boolean;
  shouldShowBanner: boolean;
  canShowInstallAction: boolean;
  triggerNativeInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismissBanner: () => void;
}

export function usePwaInstall(): UsePwaInstallResult {
  const [env, setEnv] = useState<InstallEnvironment>(readBrowserEnvironment);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => capturedPrompt,
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(readDismissedFlag);

  useEffect(() => {
    initPwaInstallCapture();

    const handlePromptChange: PromptListener = (nextPrompt) => {
      setDeferredPrompt(nextPrompt);
    };
    promptListeners.add(handlePromptChange);

    const handleAppInstalled = () => {
      setEnv((prev) => ({ ...prev, isStandalone: true }));
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;
    const handleDisplayModeChange = () => {
      setEnv(readBrowserEnvironment());
    };
    mediaQuery?.addEventListener?.("change", handleDisplayModeChange);

    return () => {
      promptListeners.delete(handlePromptChange);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery?.removeEventListener?.("change", handleDisplayModeChange);
    };
  }, []);

  const triggerNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      capturedPrompt = null;
      notifyPromptListeners();
      if (choice.outcome === "accepted") {
        setEnv((prev) => ({ ...prev, isStandalone: true }));
        return "accepted";
      }
      return "dismissed";
    } catch {
      return "unavailable";
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    try {
      window.localStorage.setItem(PWA_DISMISS_STORAGE_KEY, serializeInstallDismissal());
    } catch {
      // Ignore storage quota or private browsing errors
    }
    setIsDismissed(true);
  }, []);

  const canNativeInstall = Boolean(deferredPrompt && !env.isStandalone);
  const canShowInstallAction = !env.isStandalone && (env.isMobile || canNativeInstall);
  const shouldShowBanner = canShowInstallAction && !isDismissed;

  return {
    ...env,
    canNativeInstall,
    isDismissed,
    shouldShowBanner,
    canShowInstallAction,
    triggerNativeInstall,
    dismissBanner,
  };
}
