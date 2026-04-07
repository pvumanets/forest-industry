import type { DashboardKpi } from "../../api/dashboardTypes";
import { formatKpiValue } from "../../lib/formatKpiValue";
import { dashboardHintKpiStrip } from "../../lib/dashboardSectionHints";
import { Card, CardContent } from "../ui/card";
import { ComparisonBadge } from "./ComparisonBadge";
import { DashboardSectionHeading } from "./DashboardSectionHeading";

const none: DashboardKpi["comparison"] = { kind: "none" };

export function OwnerKpiStrip({ kpis }: { kpis: DashboardKpi[] }) {
  const slice = kpis.slice(0, 6);
  if (slice.length === 0) return null;

  return (
    <section className="mt-6" aria-label="Ключевые показатели">
      <DashboardSectionHeading
        title="Ключевые показатели"
        hint={dashboardHintKpiStrip}
        hintAriaLabel="Подробнее: ключевые показатели и сравнения"
        className="mb-3"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {slice.map((k) => (
          <Card key={k.id} className="min-w-0">
            <CardContent className="space-y-2 p-4 pt-4">
              <p className="m-0 line-clamp-2 text-xs leading-snug text-muted-foreground">{k.label}</p>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="m-0 text-2xl font-bold tabular-nums leading-tight text-foreground">
                  {formatKpiValue(k.id, k.current)}
                </p>
                <ComparisonBadge c={k.comparison} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Неделя к неделе</span>
                <ComparisonBadge c={k.secondary_comparison ?? none} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
