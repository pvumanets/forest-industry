import { apiJson } from "./client";
import type { DashboardPeriod, DashboardSummary } from "./dashboardTypes";

export function getDashboardSummary(
  period: DashboardPeriod,
  anchor: string,
): Promise<DashboardSummary> {
  const q = new URLSearchParams({ period, anchor });
  return apiJson<DashboardSummary>(`/api/dashboard/summary?${q.toString()}`);
}
