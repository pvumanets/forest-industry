import { useQueries } from "@tanstack/react-query";
import { getReportSeries } from "../api/reportsApi";
import type { ReportApiTopic } from "../api/reportsTypes";

const ROLLING_SERIES_TOPICS: ReportApiTopic[] = [
  "site",
  "ozon",
  "returns",
  "maps-2gis",
  "maps-yandex",
];

export function useDashboardRollingSeries(params: {
  enabled: boolean;
  from: string;
  to: string;
  outletCode: string | null;
}) {
  const { enabled, from, to, outletCode } = params;
  const oc = outletCode;
  const baseEnabled = enabled && Boolean(from && to);

  const results = useQueries({
    queries: ROLLING_SERIES_TOPICS.map((topic) => ({
      queryKey: ["dashboard", "rolling-series", topic, from, to, oc ?? "ALL"],
      queryFn: () => getReportSeries(topic, from, to, oc),
      enabled: baseEnabled,
      staleTime: 30_000,
    })),
  });

  return {
    site: results[0]!,
    ozon: results[1]!,
    returns: results[2]!,
    maps2gis: results[3]!,
    mapsYandex: results[4]!,
    isPending: results.some((q) => q.isPending),
  };
}
