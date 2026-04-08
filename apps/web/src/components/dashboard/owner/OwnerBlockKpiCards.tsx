import type { DashboardBlock } from "../../../api/dashboardTypes";
import {
  formatKpiValue,
  formatKpiValueTitle,
  getDashboardKpiMoneyDisplay,
} from "../../../lib/formatKpiValue";
import { getKpiPolarity } from "../../../lib/kpiPolarity";
import { Card, CardContent } from "../../ui/card";
import { ComparisonBadge } from "../ComparisonBadge";
import { KpiMoneyValue } from "../KpiMoneyValue";
import { KpiValueBadgeRow } from "../KpiValueBadgeRow";
import { KpiValueOverflow } from "../KpiValueOverflow";

const none = { kind: "none" as const };

export function OwnerBlockKpiCards({ block }: { block: DashboardBlock }) {
  if (!block.kpis.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {block.kpis.map((k) => (
        <Card key={k.id} className="min-w-0 @container">
          <CardContent className="space-y-2 p-4 pt-4">
            <p className="m-0 line-clamp-2 text-xs leading-snug text-muted-foreground">{k.label}</p>
            <KpiValueBadgeRow
              value={
                k.current === null ? (
                  <KpiValueOverflow className="text-xl">—</KpiValueOverflow>
                ) : (
                  (() => {
                    const md = getDashboardKpiMoneyDisplay(k.id, k.current);
                    if (md) {
                      return (
                        <KpiMoneyValue
                          display={md}
                          className="text-xl"
                          title={formatKpiValueTitle(k.id, k.current)}
                        />
                      );
                    }
                    return (
                      <KpiValueOverflow
                        className="text-xl"
                        title={formatKpiValueTitle(k.id, k.current)}
                      >
                        {formatKpiValue(k.id, k.current)}
                      </KpiValueOverflow>
                    );
                  })()
                )
              }
              badge={<ComparisonBadge c={k.comparison} polarity={getKpiPolarity(k.id)} />}
            />
            {k.secondary_comparison ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Нед. к нед.</span>
                <ComparisonBadge
                  c={k.secondary_comparison ?? none}
                  polarity={getKpiPolarity(k.id)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
