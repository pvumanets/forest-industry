import { apiJson } from "./client";
import type { DashboardPeriod, DashboardSummary } from "./dashboardTypes";

/**
 * @param anchor Для week/month/quarter обязателен. Для rolling_4w можно не передавать (бэкенд выберет окно).
 * @param outletCode ALL по умолчанию; иначе NOVOGRAD | SVERDLOV.
 */
export function getDashboardSummary(
  period: DashboardPeriod,
  anchor?: string,
  outletCode?: string | null,
): Promise<DashboardSummary> {
  const q = new URLSearchParams({ period });
  if (anchor) {
    q.set("anchor", anchor);
  }
  const oc = outletCode?.trim();
  if (oc && oc.toUpperCase() !== "ALL") {
    q.set("outlet_code", oc.toUpperCase());
  }
  return apiJson<DashboardSummary>(`/api/dashboard/summary?${q.toString()}`);
}
