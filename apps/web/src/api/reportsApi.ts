import { apiJson } from "./client";
import type { ReportApiTopic, ReportSeriesResponse } from "./reportsTypes";

export function getReportSeries(
  topic: ReportApiTopic,
  from: string,
  to: string,
  outletCode?: string | null,
): Promise<ReportSeriesResponse> {
  const q = new URLSearchParams({ from, to });
  if (outletCode) {
    q.set("outlet_code", outletCode);
  }
  return apiJson<ReportSeriesResponse>(
    `/api/reports/${encodeURIComponent(topic)}/series?${q.toString()}`,
  );
}
