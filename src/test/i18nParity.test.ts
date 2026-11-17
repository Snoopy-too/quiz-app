import { describe, it, expect } from "vitest";
import en from "../locales/en.json";
import ja from "../locales/ja.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

describe("i18n locale parity (en vs ja)", () => {
  it("contains identical translation keys and non-empty string values in both locales", () => {
    const enFlat = flattenKeys(en as Record<string, unknown>);
    const jaFlat = flattenKeys(ja as Record<string, unknown>);

    const enKeys = Object.keys(enFlat).sort();
    const jaKeys = Object.keys(jaFlat).sort();

    const missingInJa = enKeys.filter((k) => !(k in jaFlat));
    const missingInEn = jaKeys.filter((k) => !(k in enFlat));

    expect(missingInJa).toEqual([]);
    expect(missingInEn).toEqual([]);

    for (const key of enKeys) {
      expect(typeof enFlat[key]).toBe("string");
      expect((enFlat[key] as string).trim().length).toBeGreaterThan(0);
      expect(typeof jaFlat[key]).toBe("string");
      expect((jaFlat[key] as string).trim().length).toBeGreaterThan(0);
    }
  });
});
