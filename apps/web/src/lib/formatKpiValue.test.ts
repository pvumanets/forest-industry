import { describe, expect, it } from "vitest";
import { formatKpiValue } from "./formatKpiValue";

describe("formatKpiValue", () => {
  it("null → —", () => {
    expect(formatKpiValue("OZ-REV", null)).toBe("—");
  });

  it("целое для WEB-TRF-TOT", () => {
    expect(formatKpiValue("WEB-TRF-TOT", 12345)).toMatch(/12[\s\u00a0]?345/);
  });
});
