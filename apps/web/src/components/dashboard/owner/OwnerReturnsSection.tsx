import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardBlock } from "../../../api/dashboardTypes";
import type { ReportSeriesResponse } from "../../../api/reportsTypes";
import { dashboardHintSectionReturns } from "../../../lib/dashboardSectionHints";
import { DashboardSectionHeading } from "../DashboardSectionHeading";
import { OwnerBlockKpiCards } from "./OwnerBlockKpiCards";
import { RollingComposedCombo } from "./RollingComposedCombo";

export function OwnerReturnsSection({
  block,
  seriesQ,
}: {
  block: DashboardBlock;
  seriesQ: UseQueryResult<ReportSeriesResponse>;
}) {
  return (
    <section className="space-y-4" aria-label="Возвраты">
      <DashboardSectionHeading
        title="Возвраты"
        hint={dashboardHintSectionReturns}
        hintAriaLabel="Подробнее: возвраты"
        description="Свод по офлайн и Ozon; на графике — компания (сумма и количество)."
      />
      <OwnerBlockKpiCards block={block} />
      <RollingComposedCombo
        title="Компания: сумма и количество возвратов"
        series={seriesQ.data?.series ?? []}
        barKey="DER-RET-SUM-TOT"
        lineKey="DER-RET-N-TOT"
        emptyMessage="Нет данных по возвратам в выбранном диапазоне."
        isPending={seriesQ.isPending}
      />
    </section>
  );
}
