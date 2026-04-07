import { Link as RouterLink } from "react-router-dom";
import type { DashboardBlock } from "../../api/dashboardTypes";
import { formatKpiValue } from "../../lib/formatKpiValue";
import { cn } from "../../lib/utils";
import { Card, CardContent } from "../ui/card";
import { ComparisonBadge } from "./ComparisonBadge";

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
        "block h-full text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg",
      )}
    >
      <Card className="h-full transition-colors hover:border-ring/50">
        <CardContent className="p-5 pb-5 pt-5">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">{title}</h2>

          <ul className="m-0 list-none space-y-5 p-0">
            {block.kpis.map((k) => (
              <li key={k.id} className="border-b border-border pb-5 last:border-b-0 last:pb-0">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="m-0 text-sm text-muted-foreground">{k.label}</p>
                  <ComparisonBadge c={k.comparison} />
                </div>
                <p className="m-0 text-3xl font-bold tabular-nums leading-tight text-foreground">
                  {formatKpiValue(k.id, k.current)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Было:{" "}
                  <span className="tabular-nums text-foreground">
                    {k.previous === null ? "—" : formatKpiValue(k.id, k.previous)}
                  </span>
                </p>
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
                        <li key={`${o.outlet_code}-${k.id}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground">{k.label}</span>
                            <span className="inline-flex items-center gap-2">
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                {formatKpiValue(k.id, k.current)}
                              </span>
                              <ComparisonBadge c={k.comparison} />
                            </span>
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
