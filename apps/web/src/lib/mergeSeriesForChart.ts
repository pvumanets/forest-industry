import type { SeriesRow } from "../api/reportsTypes";

/** Объединяет ряды в строки по оси x для Recharts (значения null если точки нет). */
export function mergeSeriesForChart(
  series: SeriesRow[],
): Record<string, string | number | null>[] {
  const xs = new Set<string>();
  for (const s of series) {
    for (const p of s.points) {
      xs.add(p.x);
    }
  }
  const sorted = [...xs].sort((a, b) => a.localeCompare(b));
  return sorted.map((x) => {
    const row: Record<string, string | number | null> = {
      x,
      xLabel: x,
    };
    for (const s of series) {
      const pt = s.points.find((q) => q.x === x);
      row[s.key] = pt === undefined ? null : pt.y;
    }
    return row;
  });
}

export function hasAnyPoints(series: SeriesRow[]): boolean {
  return series.some((s) => s.points.length > 0);
}
