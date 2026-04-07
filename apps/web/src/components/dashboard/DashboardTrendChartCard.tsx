import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesRow } from "../../api/reportsTypes";
import { chartGridProps, chartLineColors, chartLineCurveProps, chartStroke } from "../../lib/chartTheme";
import { hasAnyPoints, mergeSeriesForChart } from "../../lib/mergeSeriesForChart";
import { Card, CardContent } from "../ui/card";

const MAX_SERIES = 2;

function fmtTooltip(v: number) {
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

export function DashboardTrendChartCard({
  title,
  series,
  emptyMessage,
}: {
  title: string;
  series: SeriesRow[];
  emptyMessage: string;
}) {
  const subset = series.slice(0, MAX_SERIES);
  const dataset = mergeSeriesForChart(subset);
  const show = hasAnyPoints(subset);

  const tickStyle = { fill: chartStroke.tick, fontSize: 11 };

  return (
    <Card className="h-full w-full">
      <CardContent className="p-4 pb-4 pt-4">
        <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
        {!show ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataset} margin={{ left: 4, right: 8, top: 14, bottom: 6 }}>
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  dataKey="x"
                  tick={tickStyle}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => String(v).slice(5)}
                />
                <YAxis width={44} tick={tickStyle} domain={[0, "auto"]} />
                <Tooltip
                  formatter={(v) => (typeof v === "number" ? fmtTooltip(v) : String(v))}
                  labelFormatter={(l) => String(l)}
                  contentStyle={{
                    borderRadius: "var(--radius)",
                    border: `1px solid ${chartStroke.tooltipBorder}`,
                    backgroundColor: chartStroke.tooltipBg,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {subset.map((s, i) => {
                  const stroke = chartLineColors[i % chartLineColors.length];
                  return (
                    <Line
                      key={s.key}
                      {...chartLineCurveProps}
                      dataKey={s.key}
                      name={s.label}
                      stroke={stroke}
                      strokeWidth={2.25}
                      dot={{ r: 3, fill: "var(--card)", stroke: stroke, strokeWidth: 2 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
