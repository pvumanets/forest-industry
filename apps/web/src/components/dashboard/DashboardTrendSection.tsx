import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ApiError } from "../../api/client";
import type { DashboardPeriod } from "../../api/dashboardTypes";
import { getReportSeries } from "../../api/reportsApi";
import { dashboardAnchorToSeriesRange } from "../../lib/dashboardSeriesRange";
import { useNavigateOn401 } from "../../hooks/useNavigateOn401";
import { Spinner } from "../ui/spinner";
import { DashboardTrendChartCard } from "./DashboardTrendChartCard";

export function DashboardTrendSection({
  period,
  anchor,
}: {
  period: DashboardPeriod;
  anchor: string;
}) {
  const { from, to } = useMemo(
    () => dashboardAnchorToSeriesRange(period, anchor),
    [period, anchor],
  );
  const enabled = Boolean(anchor && from && to);

  const siteQ = useQuery({
    queryKey: ["dashboard", "series", "site", from, to],
    queryFn: () => getReportSeries("site", from, to),
    enabled,
    staleTime: 30_000,
  });

  const outletsQ = useQuery({
    queryKey: ["dashboard", "series", "outlets", from, to],
    queryFn: () => getReportSeries("outlets", from, to),
    enabled,
    staleTime: 30_000,
  });

  useNavigateOn401(siteQ.error);
  useNavigateOn401(outletsQ.error);

  if (!enabled) {
    return null;
  }

  const loading = siteQ.isPending || outletsQ.isPending;
  const err =
    siteQ.error instanceof ApiError
      ? siteQ.error.message
      : outletsQ.error instanceof ApiError
        ? outletsQ.error.message
        : null;

  return (
    <section className="mb-2 mt-6">
      <h2 className="mb-4 text-lg font-bold text-foreground">Динамика за период</h2>
      {loading ? (
        <div className="flex items-center gap-3 py-8 text-muted-foreground">
          <Spinner className="size-[22px] border-2" />
          <span className="text-sm">Загрузка графиков…</span>
        </div>
      ) : err ? (
        <p className="text-sm text-destructive">{String(err)}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardTrendChartCard
            title="Сайт"
            series={siteQ.data?.series ?? []}
            emptyMessage="Нет недель с данными в выбранном диапазоне."
          />
          <DashboardTrendChartCard
            title="Точки (до двух рядов)"
            series={outletsQ.data?.series ?? []}
            emptyMessage="Нет данных по точкам за период."
          />
        </div>
      )}
    </section>
  );
}
