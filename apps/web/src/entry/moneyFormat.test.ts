import { describe, expect, it } from "vitest";
import { formatRubKpiCompact, formatRubKpiDisplay } from "./moneyFormat";

describe("formatRubKpiDisplay", () => {
  it("меньше 10k — plain", () => {
    const d = formatRubKpiDisplay(9999.99);
    expect(d.mode).toBe("plain");
    if (d.mode === "plain") {
      expect(d.text).toBe(d.full);
      expect(d.text).toContain("₽");
    }
  });

  it("от 10k до 1M — тыс", () => {
    const d = formatRubKpiDisplay(324_447.04);
    expect(d.mode).toBe("scale");
    if (d.mode === "scale") {
      expect(d.suffix).toBe("тыс");
      expect(d.full).toMatch(/324/);
    }
  });

  it("млн", () => {
    const d = formatRubKpiDisplay(5_853_443.41);
    expect(d.mode).toBe("scale");
    if (d.mode === "scale") {
      expect(d.suffix).toBe("млн");
    }
  });

  it("млрд", () => {
    const d = formatRubKpiDisplay(1_234_567_890.12);
    expect(d.mode).toBe("scale");
    if (d.mode === "scale") {
      expect(d.suffix).toBe("млрд");
    }
  });
});

describe("formatRubKpiCompact", () => {
  it("меньше 10k — как полный formatRub", () => {
    const r = formatRubKpiCompact(1234.56);
    expect(r.short).toBe(r.full);
    expect(r.short).toContain("₽");
    expect(r.short).toMatch(/1[\s\u00a0]?234/);
  });

  it("тысячи в строке", () => {
    const r = formatRubKpiCompact(50_000);
    expect(r.short).toContain("тыс");
    expect(r.short).toContain("₽");
    expect(r.short).not.toBe(r.full);
  });

  it("миллионы", () => {
    const r = formatRubKpiCompact(5_853_443.41);
    expect(r.short).toContain("млн");
    expect(r.short).toContain("₽");
    expect(r.full).toMatch(/5[\s\u00a0]?853/);
    expect(r.short).not.toBe(r.full);
  });

  it("миллиарды", () => {
    const r = formatRubKpiCompact(1_234_567_890.12);
    expect(r.short).toContain("млрд");
    expect(r.full).toContain("234");
  });
});
