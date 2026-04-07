import type { DashboardBlock } from "../../../api/dashboardTypes";
import { formatKpiValue } from "../../../lib/formatKpiValue";
import { Card, CardContent } from "../../ui/card";
import { ComparisonBadge } from "../ComparisonBadge";

const none = { kind: "none" as const };

export function OwnerBlockKpiCards({ block }: { block: DashboardBlock }) {
  if (!block.kpis.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {block.kpis.map((k) => (
        <Card key={k.id} className="min-w-0">
          <CardContent className="space-y-2 p-4 pt-4">
            <p className="m-0 line-clamp-2 text-xs leading-snug text-muted-foreground">{k.label}</p>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="m-0 text-xl font-bold tabular-nums leading-tight text-foreground">
                {formatKpiValue(k.id, k.current)}
              </p>
              <ComparisonBadge c={k.comparison} />
            </div>
            {k.secondary_comparison ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Нед. к нед.</span>
                <ComparisonBadge c={k.secondary_comparison ?? none} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
