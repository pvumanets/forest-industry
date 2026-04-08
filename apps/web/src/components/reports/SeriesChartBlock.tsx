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
import { formatRub } from "../../entry/moneyFormat";
import { formatSeriesAxisOrTooltipValue } from "../../lib/reportSeriesMoney";

function tooltipFmt(value: unknown, dataKey: string | undefined) {
  if (typeof value !== "number" || !dataKey) return String(value);
  return formatSeriesAxisOrTooltipValue(dataKey, value);
}

export function SeriesChartBlock({ series }: { series: SeriesRow[] }) {
  const PALETTE = chartLineColors;
  const tickStyle = { fill: chartStroke.tick, fontSize: 10 };
  const yTickStyle = { fill: chartStroke.tick, fontSize: 11 };

  if (!hasAnyPoints(series)) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-sm text-muted-foreground">
        Нет данных за выбранный период
      </div>
    );
  }

  const data = mergeSeriesForChart(series);

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey="x"
            tick={tickStyle}
            interval="preserveStartEnd"
            angle={-30}
            textAnchor="end"
            height={70}
          />
          <YAxis
            domain={[0, "auto"]}
            tick={yTickStyle}
            width={58}
            tickFormatter={(v) =>
              typeof v === "number"
                ? formatSeriesAxisOrTooltipValue(series[0]?.key ?? "", v)
                : String(v)
            }
          />
          <Tooltip
            formatter={(v, _n, item) => tooltipFmt(v, item?.dataKey as string | undefined)}
            labelFormatter={(l) => String(l)}
            contentStyle={{
              borderRadius: "var(--radius)",
              border: `1px solid ${chartStroke.tooltipBorder}`,
              backgroundColor: chartStroke.tooltipBg,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              {...chartLineCurveProps}
              dataKey={s.key}
              name={s.label}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ozon: выручка и реклама — левая ось; заказы — правая. */
export function OzonSeriesChart({ series }: { series: SeriesRow[] }) {
  const PALETTE = chartLineColors;
  const tickStyle = { fill: chartStroke.tick, fontSize: 10 };
  const yTickStyle = { fill: chartStroke.tick, fontSize: 11 };

  if (!hasAnyPoints(series)) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-sm text-muted-foreground">
        Нет данных за выбранный период
      </div>
    );
  }
  const data = mergeSeriesForChart(series);
  const leftKeys = ["OZ-REV", "OZ-AD-SPEND"];
  const rightKeys = ["OZ-ORD"];

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="x" tick={tickStyle} angle={-30} textAnchor="end" height={70} />
          <YAxis
            yAxisId="left"
            domain={[0, "auto"]}
            tick={yTickStyle}
            width={62}
            tickFormatter={(v) => (typeof v === "number" ? formatRub(v) : String(v))}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, "auto"]}
            tick={yTickStyle}
            width={44}
            tickFormatter={(v) =>
              typeof v === "number" ? formatSeriesAxisOrTooltipValue("OZ-ORD", v) : String(v)
            }
          />
          <Tooltip
            formatter={(v, _n, item) => tooltipFmt(v, item?.dataKey as string | undefined)}
            contentStyle={{
              borderRadius: "var(--radius)",
              border: `1px solid ${chartStroke.tooltipBorder}`,
              backgroundColor: chartStroke.tooltipBg,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series
            .filter((s) => leftKeys.includes(s.key))
            .map((s, i) => (
              <Line
                key={s.key}
                yAxisId="left"
                {...chartLineCurveProps}
                dataKey={s.key}
                name={s.label}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          {series
            .filter((s) => rightKeys.includes(s.key))
            .map((s, i) => (
              <Line
                key={s.key}
                yAxisId="right"
                {...chartLineCurveProps}
                dataKey={s.key}
                name={s.label}
                stroke={PALETTE[(i + 2) % PALETTE.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Возвраты: суммы и штуки на разных графиках (масштаб). */
export function ReturnsSeriesCharts({ series }: { series: SeriesRow[] }) {
  const sums = series.filter((s) => s.key.includes("SUM"));
  const counts = series.filter((s) => !s.key.includes("SUM"));
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Суммы, ₽</h3>
        <SeriesChartBlock series={sums} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Количество, шт.</h3>
        <SeriesChartBlock series={counts} />
      </div>
    </div>
  );
}
