import { describe, expect, it } from "vitest";
import {
  detectInstallEnvironment,
  isInstallBannerDismissed,
  PWA_DISMISS_COOLDOWN_MS,
  serializeInstallDismissal,
} from "../domain/pwaInstall";

describe("detectInstallEnvironment", () => {
  it("detects iPhone Safari", () => {
    const env = detectInstallEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      maxTouchPoints: 5,
    });
    expect(env.platform).toBe("ios-safari");
    expect(env.isIOS).toBe(true);
    expect(env.isMobile).toBe(true);
    expect(env.isInAppBrowser).toBe(false);
    expect(env.isStandalone).toBe(false);
  });

  it("detects iPadOS reporting Macintosh userAgent via maxTouchPoints", () => {
    const env = detectInstallEnvironment({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      maxTouchPoints: 5,
    });
    expect(env.platform).toBe("ios-safari");
    expect(env.isIOS).toBe(true);
    expect(env.isMobile).toBe(true);
  });

  it("detects Chrome on iOS as ios-other", () => {
    const env = detectInstallEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1",
      maxTouchPoints: 5,
    });
    expect(env.platform).toBe("ios-other");
    expect(env.isIOS).toBe(true);
    expect(env.isInAppBrowser).toBe(false);
  });

  it("detects LINE in-app browser on iOS", () => {
    const env = detectInstallEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.3.0",
      maxTouchPoints: 5,
    });
    expect(env.platform).toBe("ios-other");
    expect(env.isInAppBrowser).toBe(true);
  });

  it("detects Android Chrome", () => {
    const env = detectInstallEnvironment({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
      maxTouchPoints: 5,
    });
    expect(env.platform).toBe("android");
    expect(env.isAndroid).toBe(true);
    expect(env.isMobile).toBe(true);
    expect(env.isInAppBrowser).toBe(false);
  });

  it("detects desktop browsers", () => {
    const env = detectInstallEnvironment({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      maxTouchPoints: 0,
    });
    expect(env.platform).toBe("desktop");
    expect(env.isMobile).toBe(false);
  });

  it("marks standalone when matchMediaStandalone or navigatorStandalone is true", () => {
    expect(
      detectInstallEnvironment({ userAgent: "iPhone", matchMediaStandalone: true }).isStandalone,
    ).toBe(true);
    expect(
      detectInstallEnvironment({ userAgent: "iPhone", navigatorStandalone: true }).isStandalone,
    ).toBe(true);
  });
});

describe("install banner dismissal cooldown", () => {
  it("returns true while within the 7-day cooldown", () => {
    const t0 = 1_700_000_000_000;
    const raw = serializeInstallDismissal(t0);
    expect(isInstallBannerDismissed(raw, t0 + 1000)).toBe(true);
    expect(isInstallBannerDismissed(raw, t0 + PWA_DISMISS_COOLDOWN_MS - 1)).toBe(true);
  });

  it("returns false after the cooldown expires", () => {
    const t0 = 1_700_000_000_000;
    const raw = serializeInstallDismissal(t0);
    expect(isInstallBannerDismissed(raw, t0 + PWA_DISMISS_COOLDOWN_MS)).toBe(false);
  });

  it("safely ignores null or malformed storage values", () => {
    expect(isInstallBannerDismissed(null)).toBe(false);
    expect(isInstallBannerDismissed("not-json")).toBe(false);
    expect(isInstallBannerDismissed(JSON.stringify({ dismissedAt: "bad" }))).toBe(false);
    expect(isInstallBannerDismissed(JSON.stringify({ dismissedAt: -1 }))).toBe(false);
  });
});
