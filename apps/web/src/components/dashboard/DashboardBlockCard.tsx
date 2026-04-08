import { Link as RouterLink } from "react-router-dom";
import type { DashboardBlock } from "../../api/dashboardTypes";
import {
  formatKpiValue,
  formatKpiValueTitle,
  getDashboardKpiMoneyDisplay,
} from "../../lib/formatKpiValue";
import { getKpiPolarity } from "../../lib/kpiPolarity";
import { cn } from "../../lib/utils";
import { Card, CardContent } from "../ui/card";
import { ComparisonBadge } from "./ComparisonBadge";
import { KpiMoneyValue } from "./KpiMoneyValue";
import { KpiValueBadgeRow } from "./KpiValueBadgeRow";
import { KpiValueOverflow } from "./KpiValueOverflow";

export function DashboardBlockCard({
  title,
  block,
  to,
}: {
  title: string;
  block: DashboardBlock;
  to: string;
}) {
  return (
    <RouterLink
      to={to}
      className={cn(
        "block h-full min-w-0 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg",
      )}
    >
      <Card className="h-full min-w-0 @container transition-colors hover:border-ring/50">
        <CardContent className="p-5 pb-5 pt-5">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">{title}</h2>

          <ul className="m-0 list-none space-y-5 p-0">
            {block.kpis.map((k) => (
              <li key={k.id} className="border-b border-border pb-5 last:border-b-0 last:pb-0">
                <KpiValueBadgeRow
                  value={<p className="m-0 text-sm text-muted-foreground">{k.label}</p>}
                  badge={<ComparisonBadge c={k.comparison} polarity={getKpiPolarity(k.id)} />}
                />
                <div className="mt-2 min-w-0">
                  {k.current === null ? (
                    <KpiValueOverflow variant="block" className="text-3xl">
                      —
                    </KpiValueOverflow>
                  ) : (
                    (() => {
                      const md = getDashboardKpiMoneyDisplay(k.id, k.current);
                      if (md) {
                        return (
                          <KpiMoneyValue
                            display={md}
                            className="text-3xl"
                            title={formatKpiValueTitle(k.id, k.current)}
                          />
                        );
                      }
                      return (
                        <KpiValueOverflow
                          variant="block"
                          className="text-3xl"
                          title={formatKpiValueTitle(k.id, k.current)}
                        >
                          {formatKpiValue(k.id, k.current)}
                        </KpiValueOverflow>
                      );
                    })()
                  )}
                </div>
                <div className="mt-2 min-w-0 max-w-full break-words text-sm text-muted-foreground">
                  <span
                    title={
                      k.previous === null ? undefined : formatKpiValueTitle(k.id, k.previous)
                    }
                  >
                    Было:{" "}
                    <span className="tabular-nums text-foreground">
                      {k.previous === null ? "—" : formatKpiValue(k.id, k.previous)}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {block.by_outlet && block.by_outlet.length > 0 ? (
            <>
              <div className="my-5 h-px bg-border" />
              <div className="space-y-5">
                {block.by_outlet.map((o) => (
                  <div key={o.outlet_code}>
                    <p className="text-base font-semibold text-foreground">{o.display_name}</p>
                    <ul className="mt-3 list-none space-y-3 p-0">
                      {o.kpis.map((k) => (
                        <li key={`${o.outlet_code}-${k.id}`} className="min-w-0">
                          <div className="flex w-full min-w-0 flex-col gap-2 @min-[260px]:flex-row @min-[260px]:items-start @min-[260px]:justify-between">
                            <span className="min-w-0 text-sm text-muted-foreground @min-[260px]:max-w-[42%] @min-[260px]:shrink-0 @min-[260px]:truncate">
                              {k.label}
                            </span>
                            <div className="min-w-0 w-full @min-[260px]:max-w-[55%] @min-[260px]:flex-1">
                              <KpiValueBadgeRow
                                value={
                                  k.current === null ? (
                                    <KpiValueOverflow className="text-sm font-semibold">—</KpiValueOverflow>
                                  ) : (
                                    (() => {
                                      const md = getDashboardKpiMoneyDisplay(k.id, k.current);
                                      if (md) {
                                        return (
                                          <KpiMoneyValue
                                            display={md}
                                            className="text-sm font-semibold"
                                            title={formatKpiValueTitle(k.id, k.current)}
                                          />
                                        );
                                      }
                                      return (
                                        <KpiValueOverflow
                                          className="text-sm font-semibold"
                                          title={formatKpiValueTitle(k.id, k.current)}
                                        >
                                          {formatKpiValue(k.id, k.current)}
                                        </KpiValueOverflow>
                                      );
                                    })()
                                  )
                                }
                                badge={
                                  <ComparisonBadge c={k.comparison} polarity={getKpiPolarity(k.id)} />
                                }
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <p className="mt-5 text-sm font-medium text-primary">Подробнее →</p>
        </CardContent>
      </Card>
    </RouterLink>
  );
}
