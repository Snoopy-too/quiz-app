import { z } from "zod";

export const PWA_DISMISS_STORAGE_KEY = "quizapp_pwa_install_dismissed";
export const PWA_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type InstallPlatform = "ios-safari" | "ios-other" | "android" | "desktop";

export interface InstallEnvironmentInput {
  userAgent: string;
  maxTouchPoints?: number;
  matchMediaStandalone?: boolean;
  navigatorStandalone?: boolean;
}

export interface InstallEnvironment {
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isInAppBrowser: boolean;
  platform: InstallPlatform;
}

const DismissalPayloadSchema = z.object({
  dismissedAt: z.number().int().positive(),
});

const IN_APP_BROWSER_RE =
  /Line\/|Instagram|FBAN|FBAV|FB_IAB|MicroMessenger|KAKAOTALK|BytedanceWebview|Musical_ly|Twitter/i;

const IOS_NON_SAFARI_RE = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i;

export function detectInstallEnvironment(input: InstallEnvironmentInput): InstallEnvironment {
  const ua = input.userAgent || "";
  const isStandalone = Boolean(input.matchMediaStandalone || input.navigatorStandalone);
  const isInAppBrowser = IN_APP_BROWSER_RE.test(ua);

  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && (input.maxTouchPoints ?? 0) > 1);
  const isAndroid = /Android/i.test(ua);

  let platform: InstallPlatform;
  if (isIOS) {
    const isSafari = /Safari/i.test(ua) && !IOS_NON_SAFARI_RE.test(ua) && !isInAppBrowser;
    platform = isSafari ? "ios-safari" : "ios-other";
  } else if (isAndroid) {
    platform = "android";
  } else {
    platform = "desktop";
  }

  return {
    isStandalone,
    isIOS,
    isAndroid,
    isMobile: isIOS || isAndroid,
    isInAppBrowser,
    platform,
  };
}

export function isInstallBannerDismissed(
  rawStoredValue: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (!rawStoredValue) return false;
  try {
    const parsedJson: unknown = JSON.parse(rawStoredValue);
    const parsed = DismissalPayloadSchema.safeParse(parsedJson);
    if (!parsed.success) return false;
    const elapsed = nowMs - parsed.data.dismissedAt;
    return elapsed >= 0 && elapsed < PWA_DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function serializeInstallDismissal(nowMs: number = Date.now()): string {
  return JSON.stringify({ dismissedAt: Math.floor(nowMs) });
}
