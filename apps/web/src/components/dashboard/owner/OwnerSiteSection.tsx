import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardBlock } from "../../../api/dashboardTypes";
import type { ReportSeriesResponse } from "../../../api/reportsTypes";
import { dashboardHintSectionSite } from "../../../lib/dashboardSectionHints";
import { chartGridProps, chartLineColors, chartStroke } from "../../../lib/chartTheme";
import { hasAnyPoints, mergeSeriesForChart } from "../../../lib/mergeSeriesForChart";
import { Spinner } from "../../ui/spinner";
import { Card, CardContent } from "../../ui/card";
import { DashboardSectionHeading } from "../DashboardSectionHeading";
import { OwnerBlockKpiCards } from "./OwnerBlockKpiCards";

const CH_KEYS = [
  "WEB-TRF-CH-organic",
  "WEB-TRF-CH-cpc_direct",
  "WEB-TRF-CH-direct",
] as const;

export function OwnerSiteSection({
  block,
  seriesQ,
}: {
  block: DashboardBlock;
  seriesQ: UseQueryResult<ReportSeriesResponse>;
}) {
  const series = seriesQ.data?.series ?? [];
  const subset = useMemo(() => {
    const byKey = new Map(series.map((r) => [r.key, r]));
    return CH_KEYS.map((k) => byKey.get(k)).filter((x) => x !== undefined);
  }, [series]);

  const dataset = mergeSeriesForChart(subset);
  const showChart = hasAnyPoints(subset);
  const tickStyle = { fill: chartStroke.tick, fontSize: 11 };

  const fmt = (v: number) => v.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

  return (
    <section className="space-y-4" aria-label="Сайт">
      <DashboardSectionHeading
        title="Сайт"
        hint={dashboardHintSectionSite}
        hintAriaLabel="Подробнее: блок Сайт"
        description="Трафик по каналам и поведение на сайте за выбранные недели."
      />
      <OwnerBlockKpiCards block={block} />
      <Card className="min-w-0">
        <CardContent className="p-4 pt-5">
          <h3 className="mb-3 text-sm font-bold text-foreground">Посетители по каналам</h3>
          {seriesQ.isPending ? (
            <div className="flex h-[260px] items-center justify-center gap-3 text-muted-foreground">
              <Spinner className="size-[22px] border-2" />
              <span className="text-sm">Загрузка…</span>
            </div>
          ) : !showChart ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Нет данных по каналам в выбранном диапазоне.
            </p>
          ) : (
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataset} margin={{ left: 4, right: 8, top: 12, bottom: 6 }}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis
                    dataKey="x"
                    tick={tickStyle}
                    interval="preserveStartEnd"
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis
                    width={48}
                    tick={tickStyle}
                    domain={[0, "auto"]}
                    tickFormatter={(v) => (typeof v === "number" ? fmt(v) : String(v))}
                  />
                  <Tooltip
                    formatter={(v) => (typeof v === "number" ? fmt(v) : String(v))}
                    labelFormatter={(l) => String(l)}
                    contentStyle={{
                      borderRadius: "var(--radius)",
                      border: `1px solid ${chartStroke.tooltipBorder}`,
                      backgroundColor: chartStroke.tooltipBg,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {subset.map((s, i) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      stackId="traffic"
                      fill={chartLineColors[i % chartLineColors.length] ?? "var(--chart-1)"}
                      radius={i === subset.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      maxBarSize={56}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
