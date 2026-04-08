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
import type { SeriesRow } from "../../../api/reportsTypes";
import {
  chartComboBarFill,
  chartComboLineStroke,
  chartGridProps,
  chartLineCurveProps,
  chartMaxBarSize,
  chartStroke,
} from "../../../lib/chartTheme";
import { hasAnyPoints, mergeSeriesForChart } from "../../../lib/mergeSeriesForChart";
import { formatSeriesAxisOrTooltipValue } from "../../../lib/reportSeriesMoney";
import { Spinner } from "../../ui/spinner";
import { Card, CardContent } from "../../ui/card";

function pickSeries(rows: SeriesRow[], keys: string[]): SeriesRow[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return keys.map((k) => byKey.get(k)).filter((x): x is SeriesRow => Boolean(x));
}

export function RollingComposedCombo({
  title,
  series,
  barKey,
  lineKey,
  emptyMessage,
  isPending,
}: {
  title: string;
  series: SeriesRow[];
  barKey: string;
  lineKey: string;
  emptyMessage: string;
  isPending: boolean;
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
        {isPending ? (
          <div className="flex h-[260px] items-center justify-center gap-3 text-muted-foreground">
            <Spinner className="size-[22px] border-2" />
            <span className="text-sm">Загрузка…</span>
          </div>
        ) : !show ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="h-[260px] w-full min-w-0">
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
                  width={62}
                  tick={tickStyle}
                  domain={[0, "auto"]}
                  tickFormatter={(v) =>
                    typeof v === "number" ? formatSeriesAxisOrTooltipValue(barKey, v) : String(v)
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={44}
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
