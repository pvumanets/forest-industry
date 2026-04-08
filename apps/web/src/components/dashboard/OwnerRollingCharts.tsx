import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError } from "../../api/client";
import type { DashboardPeriod } from "../../api/dashboardTypes";
import { getReportSeries } from "../../api/reportsApi";
import type { SeriesRow } from "../../api/reportsTypes";
import { dashboardAnchorToSeriesRange } from "../../lib/dashboardSeriesRange";
import {
  chartComboBarFill,
  chartComboLineStroke,
  chartGridProps,
  chartLineCurveProps,
  chartMaxBarSize,
  chartStroke,
} from "../../lib/chartTheme";
import { hasAnyPoints, mergeSeriesForChart } from "../../lib/mergeSeriesForChart";
import { formatSeriesAxisOrTooltipValue } from "../../lib/reportSeriesMoney";
import { useNavigateOn401 } from "../../hooks/useNavigateOn401";
import { dashboardHintChartsRolling } from "../../lib/dashboardSectionHints";
import { Spinner } from "../ui/spinner";
import { Card, CardContent } from "../ui/card";
import { DashboardSectionHeading } from "./DashboardSectionHeading";

function pickSeries(rows: SeriesRow[], keys: string[]): SeriesRow[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return keys.map((k) => byKey.get(k)).filter((x): x is SeriesRow => Boolean(x));
}

function ComboCard({
  title,
  series,
  barKey,
  lineKey,
  emptyMessage,
}: {
  title: string;
  series: SeriesRow[];
  barKey: string;
  lineKey: string;
  emptyMessage: string;
}) {
  const subset = useMemo(() => pickSeries(series, [barKey, lineKey]), [series, barKey, lineKey]);
  const dataset = mergeSeriesForChart(subset);
  const show = hasAnyPoints(subset);
  const tickStyle = { fill: chartStroke.tick, fontSize: 11 };
  const barFill = chartComboBarFill;
  const lineStroke = chartComboLineStroke;

  const barRow = subset.find((s) => s.key === barKey);
  const lineRow = subset.find((s) => s.key === lineKey);

  return (
    <Card className="h-full w-full min-w-0">
      <CardContent className="p-4 pt-4">
        <h3 className="mb-3 text-sm font-bold text-foreground">{title}</h3>
        {!show ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dataset} margin={{ left: 4, right: 12, top: 14, bottom: 6 }}>
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  dataKey="x"
                  tick={tickStyle}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => String(v).slice(5)}
                />
                <YAxis
                  yAxisId="left"
                  width={58}
                  tick={tickStyle}
                  domain={[0, "auto"]}
                  tickFormatter={(v) =>
                    typeof v === "number" ? formatSeriesAxisOrTooltipValue(barKey, v) : String(v)
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={54}
                  tick={tickStyle}
                  domain={[0, "auto"]}
                  tickFormatter={(v) =>
                    typeof v === "number" ? formatSeriesAxisOrTooltipValue(lineKey, v) : String(v)
                  }
                />
                <Tooltip
                  formatter={(v, _n, item) =>
                    typeof v === "number" && item?.dataKey
                      ? formatSeriesAxisOrTooltipValue(String(item.dataKey), v)
                      : String(v)
                  }
                  labelFormatter={(l) => String(l)}
                  contentStyle={{
                    borderRadius: "var(--radius)",
                    border: `1px solid ${chartStroke.tooltipBorder}`,
                    backgroundColor: chartStroke.tooltipBg,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {barRow ? (
                  <Bar
                    yAxisId="left"
                    dataKey={barKey}
                    name={barRow.label}
                    fill={barFill}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={chartMaxBarSize}
                  />
                ) : null}
                {lineRow ? (
                  <Line
                    yAxisId="right"
                    type={chartLineCurveProps.type}
                    dataKey={lineKey}
                    name={lineRow.label}
                    stroke={lineStroke}
                    strokeWidth={2.25}
                    dot={{ r: 3, fill: "var(--card)", stroke: lineStroke, strokeWidth: 2 }}
                    strokeLinecap={chartLineCurveProps.strokeLinecap}
                    strokeLinejoin={chartLineCurveProps.strokeLinejoin}
                    connectNulls
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OwnerRollingCharts({
  period,
  anchor,
  outletCode,
}: {
  period: DashboardPeriod;
  anchor: string;
  outletCode?: string | null;
}) {
  const { from, to } = useMemo(
    () => dashboardAnchorToSeriesRange(period, anchor),
    [period, anchor],
  );
  const enabled = period === "rolling_4w" && Boolean(anchor && from && to);
  const oc =
    outletCode && outletCode.trim().toUpperCase() !== "ALL" ? outletCode.trim().toUpperCase() : null;

  const companyQ = useQuery({
    queryKey: ["dashboard", "series", "company", from, to, oc ?? "ALL"],
    queryFn: () => getReportSeries("company", from, to, oc),
    enabled,
    staleTime: 30_000,
  });

  const marketingQ = useQuery({
    queryKey: ["dashboard", "series", "marketing", from, to],
    queryFn: () => getReportSeries("marketing", from, to),
    enabled,
    staleTime: 30_000,
  });

  useNavigateOn401(companyQ.error);
  useNavigateOn401(marketingQ.error);

  if (!enabled) {
    return null;
  }

  const loading = companyQ.isPending || marketingQ.isPending;
  const err =
    companyQ.error instanceof ApiError
      ? companyQ.error.message
      : marketingQ.error instanceof ApiError
        ? marketingQ.error.message
        : null;

  return (
    <section className="mb-2 mt-8" aria-label="Динамика по неделям">
      <DashboardSectionHeading
        title="Динамика по неделям"
        hint={dashboardHintChartsRolling}
        hintAriaLabel="Подробнее: графики и четырёхнедельная сводка"
        className="mb-4"
      />
      {loading ? (
        <div className="flex items-center gap-3 py-8 text-muted-foreground">
          <Spinner className="size-[22px] border-2" />
          <span className="text-sm">Загрузка графиков…</span>
        </div>
      ) : err ? (
        <p className="text-sm text-destructive">{String(err)}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ComboCard
            title={oc ? "Выручка и заказы (точка)" : "Выручка и заказы"}
            series={companyQ.data?.series ?? []}
            barKey={oc ? `OFF-REV-${oc}` : "DER-REV-TOT"}
            lineKey={oc ? `OFF-ORD-${oc}` : "DER-ORD-TOT"}
            emptyMessage="Нет недель с данными в выбранном диапазоне."
          />
          <ComboCard
            title="Расходы на рекламу"
            series={marketingQ.data?.series ?? []}
            barKey="MKT-AD-CTX"
            lineKey="MKT-AD-MAP"
            emptyMessage="Нет данных маркетинга за период."
          />
        </div>
      )}
    </section>
  );
}
