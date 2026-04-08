import { describe, expect, it } from "vitest";
import { formatKpiValue, formatKpiValueTitle } from "./formatKpiValue";

describe("formatKpiValue", () => {
  it("null → —", () => {
    expect(formatKpiValue("OZ-REV", null)).toBe("—");
  });

  it("денежный KPI с символом ₽", () => {
    expect(formatKpiValue("OZ-REV", 1234.5)).toContain("₽");
    expect(formatKpiValue("OZ-REV", 1234.5)).toMatch(/1[\s\u00a0]?234/);
  });

  it("крупные суммы — компактно млн и title на полную сумму", () => {
    const text = formatKpiValue("OZ-REV", 5_853_443.41);
    expect(text).toContain("млн");
    expect(text).toContain("₽");
    const t = formatKpiValueTitle("OZ-REV", 5_853_443.41);
    expect(t).toBeDefined();
    expect(t).toMatch(/5[\s\u00a0]?853/);
    expect(t).toContain("₽");
  });

  it("10k–1M — тыс и title", () => {
    const text = formatKpiValue("OZ-REV", 50_000);
    expect(text).toContain("тыс");
    expect(formatKpiValueTitle("OZ-REV", 50_000)).toBeDefined();
  });

  it("целое для WEB-TRF-TOT", () => {
    expect(formatKpiValue("WEB-TRF-TOT", 12345)).toMatch(/12[\s\u00a0]?345/);
  });
});
