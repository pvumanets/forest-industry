import type { DashboardPeriod } from "../api/dashboardTypes";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO date YYYY-MM-DD в локальной полуночи. */
export function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Диапазон дат для GET /api/reports/.../series в духе выбранного периода дашборда.
 * Совпадает с границами недели (Пн–Вс), календарного месяца и квартала по anchor.
 * Для rolling_4w: `anchor` — понедельник **последней** недели окна; по умолчанию 12 недель до воскресенья этой недели.
 */
export function dashboardAnchorToSeriesRange(
  period: DashboardPeriod,
  anchor: string,
  trailingWeeks: number = 12,
): { from: string; to: string } {
  if (!anchor) {
    return { from: "", to: "" };
  }

  const parts = anchor.split("-").map(Number);
  const yy = parts[0]!;
  const mm = parts[1]!;
  const dd = parts[2] ?? 1;

  if (period === "rolling_4w") {
    const endMonday = new Date(yy, mm - 1, dd);
    const endSunday = new Date(endMonday);
    endSunday.setDate(endSunday.getDate() + 6);
    const startMonday = new Date(endMonday);
    startMonday.setDate(startMonday.getDate() - (trailingWeeks - 1) * 7);
    return { from: formatIsoDate(startMonday), to: formatIsoDate(endSunday) };
  }

  if (period === "week") {
    const start = new Date(yy, mm - 1, dd);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: formatIsoDate(start), to: formatIsoDate(end) };
  }

  if (period === "month") {
    const startD = new Date(yy, mm - 1, 1);
    const endD = new Date(yy, mm, 0);
    return { from: formatIsoDate(startD), to: formatIsoDate(endD) };
  }

  const startD = new Date(yy, mm - 1, dd);
  const endMonthIndex = mm - 1 + 2;
  const endD = new Date(yy, endMonthIndex + 1, 0);
  return { from: formatIsoDate(startD), to: formatIsoDate(endD) };
}
