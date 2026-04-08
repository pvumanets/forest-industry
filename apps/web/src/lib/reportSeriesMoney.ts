import { formatRub } from "../entry/moneyFormat";

/**
 * Ключи рядов GET /api/reports/.../series — см. gp_api.report_series.build_series_payload.
 */
export function isMoneySeriesKey(key: string): boolean {
  if (key.startsWith("WEB-TRF")) return false;
  if (key.includes("ORD")) return false;
  if (key.includes("RET-N")) return false;
  if (key.startsWith("REP-RATING")) return false;
  if (key.includes("REP-REV-CNT")) return false;
  if (key.startsWith("MKT-AD-")) return true;
  if (key === "OZ-REV" || key === "OZ-AD-SPEND") return true;
  if (key === "DER-REV-TOT") return true;
  if (key.startsWith("OFF-REV-")) return true;
  if (key.includes("RET-SUM")) return true;
  return false;
}

const ratingFmt = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const intChartFmt = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

/** Tooltip и подписи осей графиков отчётов / дашборда. */
export function formatSeriesAxisOrTooltipValue(key: string, v: number): string {
  if (isMoneySeriesKey(key)) return formatRub(v);
  if (key.startsWith("REP-RATING")) return ratingFmt.format(v);
  return intChartFmt.format(v);
}
