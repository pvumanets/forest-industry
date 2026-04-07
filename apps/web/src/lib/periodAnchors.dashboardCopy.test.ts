import { describe, expect, it } from "vitest";
import { formatDashboardUpdatedAt, formatRollingPeriodHumanRange } from "./periodAnchors";

describe("formatRollingPeriodHumanRange", () => {
  it("same calendar year: year once at end", () => {
    expect(formatRollingPeriodHumanRange("2026-03-09", "2026-03-30")).toMatch(/9 марта.*5 апреля 2026/);
  });

  it("cross year: both parts include year", () => {
    expect(formatRollingPeriodHumanRange("2025-12-29", "2026-01-05")).toMatch(/2025/);
    expect(formatRollingPeriodHumanRange("2025-12-29", "2026-01-05")).toMatch(/2026/);
  });

  it("returns null for empty input", () => {
    expect(formatRollingPeriodHumanRange("", "2026-01-05")).toBeNull();
    expect(formatRollingPeriodHumanRange("2026-01-05", "")).toBeNull();
  });
});

describe("formatDashboardUpdatedAt", () => {
  it("formats with month name and comma before time", () => {
    const s = formatDashboardUpdatedAt("2026-04-07T08:23:00.000Z");
    expect(s).toBeTruthy();
    expect(s).toMatch(/апреля/);
    expect(s).toMatch(/,/);
    expect(s).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns null for invalid iso", () => {
    expect(formatDashboardUpdatedAt(null)).toBeNull();
    expect(formatDashboardUpdatedAt("")).toBeNull();
    expect(formatDashboardUpdatedAt("not-a-date")).toBeNull();
  });
});
