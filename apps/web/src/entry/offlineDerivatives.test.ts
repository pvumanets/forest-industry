import { describe, expect, it } from "vitest";
import { offlineAvgCheck, offlineRetAvg } from "./offlineDerivatives";

describe("offlineAvgCheck", () => {
  it("считает средний чек", () => {
    const r = offlineAvgCheck("10000.50", "10");
    expect(r.isDash).toBe(false);
    expect(r.text).toMatch(/1[\s\u00a0]?000/);
    expect(r.text).toContain("₽");
  });

  it("при нуле заказов — прочерк и noOrders", () => {
    const r = offlineAvgCheck("1000", "0");
    expect(r.isDash).toBe(true);
    expect(r.noOrders).toBe(true);
  });
});

describe("offlineRetAvg", () => {
  it("при нуле возвратов — прочерк", () => {
    const r = offlineRetAvg("500", "0");
    expect(r.isDash).toBe(true);
  });
});
