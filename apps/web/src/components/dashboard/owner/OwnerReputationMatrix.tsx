import { Link as RouterLink } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "../../../api/client";
import type { ReportSeriesResponse, SeriesRow } from "../../../api/reportsTypes";
import { dashboardHintSectionReputation } from "../../../lib/dashboardSectionHints";
import { formatKpiValue } from "../../../lib/formatKpiValue";
import { cn } from "../../../lib/utils";
import { Spinner } from "../../ui/spinner";
import { Card, CardContent } from "../../ui/card";
import { DashboardSectionHeading } from "../DashboardSectionHeading";

const PHYSICAL_OUTLETS = [
  { code: "NOVOGRAD", displayName: "Новоград" },
  { code: "SVERDLOV", displayName: "Свердлов" },
] as const;

function outletsForFilter(filter: string) {
  if (filter === "ALL") return [...PHYSICAL_OUTLETS];
  return PHYSICAL_OUTLETS.filter((o) => o.code === filter);
}

function lastY(series: SeriesRow[], key: string): number | null {
  const row = series.find((s) => s.key === key);
  if (!row?.points.length) return null;
  const sorted = [...row.points].sort((a, b) => a.x.localeCompare(b.x));
  for (let i = sorted.length - 1; i >= 0; i--) {
    const y = sorted[i]?.y;
    if (y != null && typeof y === "number" && !Number.isNaN(y)) return y;
  }
  return null;
}

function MatrixCell({
  outletName,
  platformLabel,
  rating,
  reviews,
  to,
  pending,
}: {
  outletName: string;
  platformLabel: string;
  rating: number | null;
  reviews: number | null;
  to: string;
  pending: boolean;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex h-full flex-col p-4 pt-4">
        <p className="m-0 text-xs font-medium text-muted-foreground">
          {outletName} · {platformLabel}
        </p>
        {pending ? (
          <div className="mt-4 flex flex-1 items-center justify-center py-6">
            <Spinner className="size-[20px] border-2" />
          </div>
        ) : (
          <>
            <p className="mt-3 m-0 text-2xl font-bold tabular-nums text-foreground">
              {rating === null ? "—" : formatKpiValue("REP-RATING-AVG", rating)}
            </p>
            <p className="mt-1 m-0 text-xs text-muted-foreground">Средняя оценка</p>
            <p className="mt-3 m-0 text-lg font-semibold tabular-nums text-foreground">
              {reviews === null ? "—" : formatKpiValue("REP-REV-CNT-TOT", reviews)}
            </p>
            <p className="mt-0.5 m-0 text-xs text-muted-foreground">Отзывов (последний снимок в окне)</p>
          </>
        )}
        <RouterLink
          to={to}
          className={cn(
            "mt-auto pt-4 text-sm font-medium text-primary no-underline hover:underline",
          )}
        >
          Подробнее →
        </RouterLink>
      </CardContent>
    </Card>
  );
}

export function OwnerReputationMatrix({
  outletFilter,
  maps2gisQ,
  mapsYandexQ,
}: {
  outletFilter: string;
  maps2gisQ: UseQueryResult<ReportSeriesResponse>;
  mapsYandexQ: UseQueryResult<ReportSeriesResponse>;
}) {
  const outlets = outletsForFilter(outletFilter);
  const pending = maps2gisQ.isPending || mapsYandexQ.isPending;
  const err =
    maps2gisQ.error instanceof ApiError
      ? maps2gisQ.error.message
      : mapsYandexQ.error instanceof ApiError
        ? mapsYandexQ.error.message
        : maps2gisQ.isError || mapsYandexQ.isError
          ? "Не удалось загрузить данные карт."
          : null;

  return (
    <section className="space-y-4" aria-label="Репутация на картах">
      <DashboardSectionHeading
        title="Карты и репутация"
        hint={dashboardHintSectionReputation}
        hintAriaLabel="Подробнее: оценки и отзывы на картах"
        description="Последние значения в выбранном диапазоне недель по точкам и площадкам."
      />
      {err ? (
        <p className="text-sm text-destructive">{String(err)}</p>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-3 sm:grid-cols-2",
            outlets.length > 1 && "lg:grid-cols-4",
          )}
        >
          {outlets.flatMap((o) => [
            <MatrixCell
              key={`${o.code}-2gis`}
              outletName={o.displayName}
              platformLabel="2ГИС"
              rating={lastY(maps2gisQ.data?.series ?? [], `REP-RATING-${o.code}`)}
              reviews={lastY(maps2gisQ.data?.series ?? [], `REP-REV-CNT-${o.code}`)}
              to="/reports/maps/2gis"
              pending={pending}
            />,
            <MatrixCell
              key={`${o.code}-yandex`}
              outletName={o.displayName}
              platformLabel="Яндекс"
              rating={lastY(mapsYandexQ.data?.series ?? [], `REP-RATING-${o.code}`)}
              reviews={lastY(mapsYandexQ.data?.series ?? [], `REP-REV-CNT-${o.code}`)}
              to="/reports/maps/yandex"
              pending={pending}
            />,
          ])}
        </div>
      )}
    </section>
  );
}
