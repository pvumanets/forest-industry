import { useMemo, useState } from "react";
import type { DashboardOutletSlice } from "../../api/dashboardTypes";
import {
  formatKpiValue,
  formatKpiValueTitle,
  getDashboardKpiMoneyDisplay,
} from "../../lib/formatKpiValue";
import { getKpiPolarity } from "../../lib/kpiPolarity";
import { dashboardHintOutletCompare } from "../../lib/dashboardSectionHints";
import { cn } from "../../lib/utils";
import { nativeSelectClass } from "../../lib/formNativeClasses";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { ComparisonBadge } from "./ComparisonBadge";
import { KpiMoneyValue } from "./KpiMoneyValue";
import { KpiValueBadgeRow } from "./KpiValueBadgeRow";
import { KpiValueOverflow } from "./KpiValueOverflow";
import { DashboardSectionHeading } from "./DashboardSectionHeading";

const METRICS = [
  { id: "OFF-REV", label: "Выручка" },
  { id: "OFF-ORD", label: "Заказы" },
  { id: "OFF-AVG-CHK", label: "Средний чек" },
] as const;

type MetricId = (typeof METRICS)[number]["id"];

function kpiForOutlet(slice: DashboardOutletSlice, id: MetricId) {
  return slice.kpis.find((k) => k.id === id);
}

export function OwnerOutletCompare({ byOutlet }: { byOutlet: DashboardOutletSlice[] }) {
  const [metricId, setMetricId] = useState<MetricId>("OFF-REV");
  const rows = useMemo(() => {
    const withVals = byOutlet
      .map((o) => {
        const k = kpiForOutlet(o, metricId);
        const v = k?.current ?? null;
        return { slice: o, kpi: k, value: typeof v === "number" ? v : 0 };
      })
      .filter((r) => r.kpi);
    const max = Math.max(1, ...withVals.map((r) => Math.abs(r.value)));
    return withVals.map((r) => ({ ...r, pct: max > 0 ? (Math.abs(r.value) / max) * 100 : 0 }));
  }, [byOutlet, metricId]);

  if (byOutlet.length === 0) {
    return null;
  }

  return (
    <section className="mt-8" aria-label="Сравнение точек">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DashboardSectionHeading
          title="Точки офлайн"
          hint={dashboardHintOutletCompare}
          hintAriaLabel="Подробнее: сравнение точек офлайн"
          className="min-w-0 flex-1"
        />
        <div className="w-full max-w-xs">
          <Label htmlFor="outlet-metric" className="mb-2">
            Метрика для сравнения
          </Label>
          <select
            id="outlet-metric"
            className={nativeSelectClass}
            value={metricId}
            onChange={(e) => setMetricId(e.target.value as MetricId)}
          >
            {METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="min-w-0 @container">
        <CardContent className="space-y-5 p-4 pt-5 sm:p-5">
          <div className="space-y-4">
            {rows.map(({ slice, kpi, pct }) => {
              if (!kpi) return null;
              return (
                <div key={slice.outlet_code}>
                  <div className="mb-1 flex w-full min-w-0 flex-col gap-2 @min-[240px]:flex-row @min-[240px]:items-start @min-[240px]:justify-between">
                    <span className="min-w-0 text-sm font-medium @min-[240px]:max-w-[40%] @min-[240px]:shrink-0 @min-[240px]:truncate">
                      {slice.display_name}
                    </span>
                    <div className="min-w-0 w-full @min-[240px]:max-w-[56%] @min-[240px]:flex-1">
                      <KpiValueBadgeRow
                        value={
                          kpi.current === null ? (
                            <KpiValueOverflow className="text-sm font-semibold">—</KpiValueOverflow>
                          ) : (
                            (() => {
                              const md = getDashboardKpiMoneyDisplay(kpi.id, kpi.current);
                              if (md) {
                                return (
                                  <KpiMoneyValue
                                    display={md}
                                    className="text-sm font-semibold"
                                    title={formatKpiValueTitle(kpi.id, kpi.current)}
                                  />
                                );
                              }
                              return (
                                <KpiValueOverflow
                                  className="text-sm font-semibold"
                                  title={formatKpiValueTitle(kpi.id, kpi.current)}
                                >
                                  {formatKpiValue(kpi.id, kpi.current)}
                                </KpiValueOverflow>
                              );
                            })()
                          )
                        }
                        badge={
                          <ComparisonBadge c={kpi.comparison} polarity={getKpiPolarity(kpi.id)} />
                        }
                      />
                    </div>
                  </div>
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-muted"
                    role="presentation"
                    aria-hidden
                  >
                    <div
                      className={cn("h-full rounded-full bg-primary/85 transition-[width] duration-300")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Таблица
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Точка</th>
                    <th className="py-2 pr-3 font-medium">Сейчас</th>
                    <th className="py-2 pr-3 font-medium">Было</th>
                    <th className="py-2 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ slice, kpi }) => {
                    if (!kpi) return null;
                    return (
                      <tr key={slice.outlet_code} className="border-b border-border/80 last:border-0">
                        <td className="py-2 pr-3 font-medium text-foreground">{slice.display_name}</td>
                        <td
                          className="max-w-[9rem] break-words py-2 pr-3 tabular-nums text-foreground"
                          title={formatKpiValueTitle(kpi.id, kpi.current)}
                        >
                          {formatKpiValue(kpi.id, kpi.current)}
                        </td>
                        <td
                          className="max-w-[9rem] break-words py-2 pr-3 tabular-nums text-muted-foreground"
                          title={
                            kpi.previous === null
                              ? undefined
                              : formatKpiValueTitle(kpi.id, kpi.previous)
                          }
                        >
                          {kpi.previous === null ? "—" : formatKpiValue(kpi.id, kpi.previous)}
                        </td>
                        <td className="py-2">
                          <ComparisonBadge c={kpi.comparison} polarity={getKpiPolarity(kpi.id)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
