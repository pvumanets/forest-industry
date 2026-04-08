import { describe, expect, it } from "vitest";
import {
  formatDashboardUpdatedAt,
  formatRollingFourWeeksSelectLabel,
  formatRollingPeriodHumanRange,
  formatWeekRangeLabel,
  monthAnchorOptions,
  quarterAnchorOptions,
} from "./periodAnchors";

describe("formatRollingPeriodHumanRange", () => {
  it("same calendar year: year once at end", () => {
    expect(formatRollingPeriodHumanRange("2026-03-09", "2026-03-30")).toMatch(/9 марта.*5 апреля 2026/);
  });

  it("cross year: both parts include year", () => {
    expect(formatRollingPeriodHumanRange("2025-12-29", "2026-01-05")).toMatch(/2025/);
    expect(formatRollingPeriodHumanRange("2025-12-29", "2026-01-05")).toMatch(/2026/);
  });

  it("cross year: no « г.» suffix from locale", () => {
    const s = formatRollingPeriodHumanRange("2025-12-29", "2026-01-05");
    expect(s).toBeTruthy();
    expect(s).not.toMatch(/\sг\.?\s/u);
  });

  it("returns null for empty input", () => {
    expect(formatRollingPeriodHumanRange("", "2026-01-05")).toBeNull();
    expect(formatRollingPeriodHumanRange("2026-01-05", "")).toBeNull();
  });
});

describe("formatWeekRangeLabel", () => {
  it("single week crossing month: day–month style with year at end", () => {
    expect(formatWeekRangeLabel("2026-03-30")).toMatch(/30 марта.*5 апреля 2026/);
  });

  it("single week crossing year: both sides include year", () => {
    const s = formatWeekRangeLabel("2025-12-29");
    expect(s).toMatch(/2025/);
    expect(s).toMatch(/2026/);
  });
});

describe("formatRollingFourWeeksSelectLabel", () => {
  it("anchor end 2026-03-30 spans four weeks from 9 Mar through 5 Apr", () => {
    const s = formatRollingFourWeeksSelectLabel("2026-03-30");
    expect(s).toMatch(/9 марта/);
    expect(s).toMatch(/5 апреля/);
    expect(s).toMatch(/2026/);
  });

  it("returns null for empty anchor", () => {
    expect(formatRollingFourWeeksSelectLabel("")).toBeNull();
    expect(formatRollingFourWeeksSelectLabel("   ")).toBeNull();
  });
});

describe("monthAnchorOptions", () => {
  it("labels omit trailing « г.»", () => {
    for (const o of monthAnchorOptions(3)) {
      expect(o.label).not.toMatch(/\sг\.?\s*$/u);
    }
  });
});

describe("quarterAnchorOptions", () => {
  it("uses Roman numerals and «квартал»", () => {
    const labels = quarterAnchorOptions(4).map((o) => o.label);
    expect(labels.some((l) => /^I квартал \d{4}$/.test(l))).toBe(true);
    expect(labels.some((l) => /^II квартал \d{4}$/.test(l))).toBe(true);
    expect(labels.some((l) => /^III квартал \d{4}$/.test(l))).toBe(true);
    expect(labels.some((l) => /^IV квартал \d{4}$/.test(l))).toBe(true);
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
