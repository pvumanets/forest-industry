/**
 * Полярность KPI для семантической окраски дельты: «рост хороший / плохой».
 * ID синхронизированы с gp_api.dashboard_service (сводка дашборда).
 */

export type KpiPolarity = "higher_better" | "lower_better" | "neutral";

/** Ниже порога — нейтральный бейдж (шум), строго меньше. */
export const NEGLIGIBLE_PERCENT = 0.5;

const HIGHER_BETTER = new Set<string>([
  "DER-REV-TOT",
  "DER-ORD-TOT",
  "DER-AVG-CHK-CO",
  "OFF-REV",
  "OFF-ORD",
  "OFF-AVG-CHK",
  "OFF-REV-SUM",
  "OFF-ORD-SUM",
  "OFF-AVG-CHK-SUM",
  "OZ-REV",
  "OZ-ORD",
  "OZ-AVG-CHK",
  "WEB-TRF-TOT",
  "REP-RATING-AVG",
  "REP-REV-CNT-TOT",
]);

const LOWER_BETTER = new Set<string>([
  "OFF-RET-SUM-TOT",
  "OFF-RET-N-TOT",
  "OZ-RET-SUM",
  "OZ-RET-N",
  "DER-RET-SUM-TOT",
  "WEB-BEH-BOUNCE",
  "DER-AD-TOTAL",
  "OZ-AD-SPEND",
]);

const NEUTRAL = new Set<string>(["DER-OZ-SHARE", "WEB-BEH-TIME", "REP-REV-DELTA"]);

export function getKpiPolarity(id: string): KpiPolarity {
  if (HIGHER_BETTER.has(id)) return "higher_better";
  if (LOWER_BETTER.has(id)) return "lower_better";
  if (NEUTRAL.has(id)) return "neutral";
  return "neutral";
}

/** Для тестов и регресса: все ID, явно занесённые в реестр. */
export const ALL_REGISTRY_KPI_IDS: string[] = [
  ...HIGHER_BETTER,
  ...LOWER_BETTER,
  ...NEUTRAL,
];
