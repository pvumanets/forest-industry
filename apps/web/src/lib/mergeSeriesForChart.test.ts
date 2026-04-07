import { describe, expect, it } from "vitest";
import { hasAnyPoints, mergeSeriesForChart } from "./mergeSeriesForChart";

describe("mergeSeriesForChart", () => {
  it("объединяет по x", () => {
    const rows = mergeSeriesForChart([
      {
        key: "A",
        label: "A",
        points: [
          { x: "2026-01-01", y: 1 },
          { x: "2026-01-08", y: 2 },
        ],
      },
      {
        key: "B",
        label: "B",
        points: [{ x: "2026-01-08", y: 10 }],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1].A).toBe(2);
    expect(rows[1].B).toBe(10);
    expect(rows[0].B).toBeNull();
  });
});

describe("hasAnyPoints", () => {
  it("пустые ряды", () => {
    expect(hasAnyPoints([{ key: "a", label: "a", points: [] }])).toBe(false);
  });
});
