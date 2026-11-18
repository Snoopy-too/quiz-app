import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  attemptChunkRecoveryReload,
  isChunkLoadError,
  loadWithRetry,
} from "../utils/lazyWithRetry";

describe("lazyWithRetry", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("recognizes browser dynamic module and chunk load errors", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://example.com/assets/EditQuiz-B71Y5_eJ.js",
        ),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(new Error("Importing a module script failed.")),
    ).toBe(true);
    expect(isChunkLoadError(new Error("Database query failed"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it("retries once on a transient chunk fetch failure and resolves cleanly", async () => {
    const Dummy = () => null;
    const importer = vi
      .fn()
      .mockRejectedValueOnce(
        new TypeError("Failed to fetch dynamically imported module: /assets/Chunk.js"),
      )
      .mockResolvedValueOnce({ default: Dummy });

    const mod = await loadWithRetry(importer, { retryDelayMs: 0 });
    expect(mod.default).toBe(Dummy);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-chunk errors", async () => {
    const importer = vi.fn().mockRejectedValue(new Error("SyntaxError inside component"));

    await expect(loadWithRetry(importer, { retryDelayMs: 0 })).rejects.toThrow(
      "SyntaxError inside component",
    );
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("triggers reload at most once within the cooldown window when chunk error persists", async () => {
    const reloadFn = vi.fn();
    const chunkErr = new TypeError(
      "Failed to fetch dynamically imported module: /assets/Stale.js",
    );
    const importer = vi.fn().mockRejectedValue(chunkErr);

    await expect(
      loadWithRetry(importer, {
        retryDelayMs: 0,
        reloadFn,
        hangAfterReload: false,
      }),
    ).rejects.toThrow("Failed to fetch dynamically imported module");
    expect(reloadFn).toHaveBeenCalledTimes(1);

    // Second failure within cooldown skips reload so we never infinite-loop
    expect(attemptChunkRecoveryReload(chunkErr, reloadFn)).toBe(false);
    expect(reloadFn).toHaveBeenCalledTimes(1);
  });
});
