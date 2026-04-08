import { describe, expect, it } from "vitest";
import { formatSeriesAxisOrTooltipValue, isMoneySeriesKey } from "./reportSeriesMoney";

describe("isMoneySeriesKey", () => {
  it("денежные ключи", () => {
    expect(isMoneySeriesKey("MKT-AD-CTX")).toBe(true);
    expect(isMoneySeriesKey("MKT-AD-MAP")).toBe(true);
    expect(isMoneySeriesKey("OZ-REV")).toBe(true);
    expect(isMoneySeriesKey("OZ-AD-SPEND")).toBe(true);
    expect(isMoneySeriesKey("DER-REV-TOT")).toBe(true);
    expect(isMoneySeriesKey("OFF-REV-M1")).toBe(true);
    expect(isMoneySeriesKey("OFF-RET-SUM-TOT")).toBe(true);
    expect(isMoneySeriesKey("DER-RET-SUM-TOT")).toBe(true);
  });

  it("неденежные ключи", () => {
    expect(isMoneySeriesKey("WEB-TRF-TOT")).toBe(false);
    expect(isMoneySeriesKey("WEB-TRF-CH-organic")).toBe(false);
    expect(isMoneySeriesKey("DER-ORD-TOT")).toBe(false);
    expect(isMoneySeriesKey("OFF-ORD-M1")).toBe(false);
    expect(isMoneySeriesKey("OZ-ORD")).toBe(false);
    expect(isMoneySeriesKey("DER-RET-N-TOT")).toBe(false);
    expect(isMoneySeriesKey("REP-RATING-X")).toBe(false);
    expect(isMoneySeriesKey("REP-REV-CNT-X")).toBe(false);
  });
});

describe("formatSeriesAxisOrTooltipValue", () => {
  it("добавляет ₽ для денег", () => {
    expect(formatSeriesAxisOrTooltipValue("OZ-REV", 100)).toContain("₽");
  });

  it("целое для трафика", () => {
    expect(formatSeriesAxisOrTooltipValue("WEB-TRF-TOT", 12345)).toMatch(/12[\s\u00a0]?345/);
    expect(formatSeriesAxisOrTooltipValue("WEB-TRF-TOT", 12345)).not.toContain("₽");
  });
});
