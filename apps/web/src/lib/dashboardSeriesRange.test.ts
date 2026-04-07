import { describe, expect, it } from "vitest";
import { dashboardAnchorToSeriesRange } from "./dashboardSeriesRange";

describe("dashboardAnchorToSeriesRange", () => {
  it("week: Monday anchor to Sunday", () => {
    const { from, to } = dashboardAnchorToSeriesRange("week", "2026-02-09");
    expect(from).toBe("2026-02-09");
    expect(to).toBe("2026-02-15");
  });

  it("month: full calendar month", () => {
    const { from, to } = dashboardAnchorToSeriesRange("month", "2026-04-01");
    expect(from).toBe("2026-04-01");
    expect(to).toBe("2026-04-30");
  });

  it("quarter: Q1 through March", () => {
    const { from, to } = dashboardAnchorToSeriesRange("quarter", "2026-01-01");
    expect(from).toBe("2026-01-01");
    expect(to).toBe("2026-03-31");
  });

  it("empty anchor", () => {
    expect(dashboardAnchorToSeriesRange("week", "")).toEqual({ from: "", to: "" });
  });

  it("rolling_4w: 12 weeks ending anchor Sunday", () => {
    const { from, to } = dashboardAnchorToSeriesRange("rolling_4w", "2026-03-23");
    // 12 недель: понедельник (anchor − 11·7) … воскресенье (anchor + 6); 2026 не високосный.
    expect(from).toBe("2026-01-05");
    expect(to).toBe("2026-03-29");
  });
});
