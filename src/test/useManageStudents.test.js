import { describe, it, expect } from "vitest";
import useManageStudents from "../hooks/useManageStudents";

describe("useManageStudents", () => {
  it("exports a function", () => {
    expect(typeof useManageStudents).toBe("function");
  });
});
