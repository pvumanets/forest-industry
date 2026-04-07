import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardBlock } from "../../../api/dashboardTypes";
import type { ReportSeriesResponse } from "../../../api/reportsTypes";
import { dashboardHintSectionOzon } from "../../../lib/dashboardSectionHints";
import { DashboardSectionHeading } from "../DashboardSectionHeading";
import { OwnerBlockKpiCards } from "./OwnerBlockKpiCards";
import { RollingComposedCombo } from "./RollingComposedCombo";

export function OwnerOzonSection({
  block,
  seriesQ,
}: {
  block: DashboardBlock;
  seriesQ: UseQueryResult<ReportSeriesResponse>;
}) {
  return (
    <section className="space-y-4" aria-label="Ozon">
      <DashboardSectionHeading
        title="Ozon"
        hint={dashboardHintSectionOzon}
        hintAriaLabel="Подробнее: блок Ozon"
        description="Выручка, заказы и реклама на маркетплейсе по неделям."
      />
      <OwnerBlockKpiCards block={block} />
      <RollingComposedCombo
        title="Динамика: выручка и заказы"
        series={seriesQ.data?.series ?? []}
        barKey="OZ-REV"
        lineKey="OZ-ORD"
        emptyMessage="Нет данных Ozon в выбранном диапазоне."
        isPending={seriesQ.isPending}
      />
    </section>
  );
}
