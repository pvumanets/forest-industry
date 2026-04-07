import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import { getDashboardSummary } from "../api/dashboardApi";
import type { DashboardPeriod } from "../api/dashboardTypes";
import { DashboardBlockCard } from "../components/dashboard/DashboardBlockCard";
import { DashboardTrendSection } from "../components/dashboard/DashboardTrendSection";
import { OwnerKpiStrip } from "../components/dashboard/OwnerKpiStrip";
import { OwnerOutletCompare } from "../components/dashboard/OwnerOutletCompare";
import { OwnerOzonSection } from "../components/dashboard/owner/OwnerOzonSection";
import { OwnerQuickLinks } from "../components/dashboard/owner/OwnerQuickLinks";
import { OwnerReputationMatrix } from "../components/dashboard/owner/OwnerReputationMatrix";
import { OwnerReturnsSection } from "../components/dashboard/owner/OwnerReturnsSection";
import { OwnerSiteSection } from "../components/dashboard/owner/OwnerSiteSection";
import { OwnerRollingCharts } from "../components/dashboard/OwnerRollingCharts";
import { DashboardHintButton, DashboardSectionHeading } from "../components/dashboard/DashboardSectionHeading";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import { TooltipProvider } from "../components/ui/tooltip";
import { cn } from "../lib/utils";
import { DASHBOARD_BLOCKS } from "../dashboard/blockMeta";
import { useDashboardRollingSeries } from "../hooks/useDashboardRollingSeries";
import { useNavigateOn401 } from "../hooks/useNavigateOn401";
import { useWeekMondayOptions } from "../hooks/useWeekMondayOptions";
import { dashboardAnchorToSeriesRange } from "../lib/dashboardSeriesRange";
import { nativeSelectClass } from "../lib/formNativeClasses";
import {
  dashboardHintLegacyCards,
  dashboardHintPanelControls,
  dashboardHintRollingMeta,
} from "../lib/dashboardSectionHints";
import {
  formatDashboardUpdatedAt,
  formatRollingPeriodHumanRange,
  formatWeekRangeLabel,
  monthAnchorOptions,
  quarterAnchorOptions,
} from "../lib/periodAnchors";

const OUTLET_OPTIONS = [
  { value: "ALL", label: "Все точки" },
  { value: "NOVOGRAD", label: "Новоград" },
  { value: "SVERDLOV", label: "Свердлов" },
] as const;

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("rolling_4w");
  const [anchor, setAnchor] = useState("");
  const [rollingAnchor, setRollingAnchor] = useState("");
  const [outletFilter, setOutletFilter] =
    useState<(typeof OUTLET_OPTIONS)[number]["value"]>("ALL");

  const weekMondays = useWeekMondayOptions();
  const monthOpts = useMemo(() => monthAnchorOptions(24), []);
  const quarterOpts = useMemo(() => quarterAnchorOptions(12), []);

  useEffect(() => {
    setAnchor("");
    setRollingAnchor("");
  }, [period]);

  useEffect(() => {
    if (period === "rolling_4w") return;
    if (anchor) return;
    if (period === "week" && weekMondays[0]) {
      setAnchor(weekMondays[0]);
    } else if (period === "month" && monthOpts[0]) {
      setAnchor(monthOpts[0].value);
    } else if (period === "quarter" && quarterOpts[0]) {
      setAnchor(quarterOpts[0].value);
    }
  }, [period, anchor, weekMondays, monthOpts, quarterOpts]);

  const summaryEnabled = period === "rolling_4w" ? true : Boolean(anchor);

  const summaryQ = useQuery({
    queryKey: [
      "dashboard",
      "summary",
      period,
      period === "rolling_4w" ? rollingAnchor : anchor,
      outletFilter,
    ],
    queryFn: () =>
      getDashboardSummary(
        period,
        period === "rolling_4w" ? rollingAnchor || undefined : anchor,
        outletFilter === "ALL" ? null : outletFilter,
      ),
    enabled: summaryEnabled,
    staleTime: 60_000,
  });

  useNavigateOn401(summaryQ.error);

  const effectiveRollingAnchor =
    period === "rolling_4w" ? rollingAnchor || summaryQ.data?.anchor || "" : "";

  const rollingRange = useMemo(() => {
    if (period !== "rolling_4w" || !effectiveRollingAnchor) {
      return { from: "", to: "" };
    }
    return dashboardAnchorToSeriesRange("rolling_4w", effectiveRollingAnchor);
  }, [period, effectiveRollingAnchor]);

  const rollingSeries = useDashboardRollingSeries({
    enabled: period === "rolling_4w",
    from: rollingRange.from,
    to: rollingRange.to,
    outletCode: outletFilter === "ALL" ? null : outletFilter,
  });

  useNavigateOn401(rollingSeries.site.error);
  useNavigateOn401(rollingSeries.ozon.error);
  useNavigateOn401(rollingSeries.returns.error);
  useNavigateOn401(rollingSeries.maps2gis.error);
  useNavigateOn401(rollingSeries.mapsYandex.error);

  let banner: string | null = null;
  if (summaryQ.error instanceof ApiError) {
    if (summaryQ.error.status === 403) {
      banner = "Недостаточно прав для просмотра дашборда.";
    } else if (summaryQ.error.status === 422) {
      banner =
        typeof summaryQ.error.message === "string"
          ? summaryQ.error.message
          : "Некорректные параметры периода.";
    } else if (summaryQ.error.message && summaryQ.error.status >= 500) {
      banner = `Ошибка сервера (${summaryQ.error.status}): ${summaryQ.error.message}`;
    } else {
      banner = "Не удалось загрузить сводку. Проверьте соединение.";
    }
  }

  const periodTabs = (
    [
      ["rolling_4w", "4 недели"],
      ["week", "Неделя"],
      ["month", "Месяц"],
      ["quarter", "Квартал"],
    ] as const
  ).map(([p, label]) => {
    const active = period === p;
    return (
      <button
        key={p}
        type="button"
        role="tab"
        aria-selected={active}
        className={cn(
          "relative z-0 inline-flex min-h-9 w-full items-center justify-center rounded-md px-2 text-sm font-medium transition-[color,box-shadow,background-color] sm:px-3",
          active
            ? "z-[1] bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => setPeriod(p)}
      >
        {label}
      </button>
    );
  });

  const legacySelectDisabled =
    (period === "week" && weekMondays.length === 0) ||
    (period === "month" && monthOpts.length === 0) ||
    (period === "quarter" && quarterOpts.length === 0);

  const rollingWindowLabel = useMemo(() => {
    const ws = summaryQ.data?.week_starts;
    if (!ws || ws.length === 0) return null;
    const first = ws[0];
    const last = ws[ws.length - 1];
    if (!first || !last) return null;
    return formatRollingPeriodHumanRange(first, last);
  }, [summaryQ.data?.week_starts]);

  const updatedLabel = formatDashboardUpdatedAt(summaryQ.data?.updated_at_max);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Сводка</h1>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex w-full max-w-xl flex-wrap items-center gap-2">
          <div
            className="grid min-h-9 w-full max-w-md min-w-0 grid-cols-4 gap-0 rounded-lg bg-muted p-1"
            role="tablist"
            aria-label="Тип периода"
          >
            {periodTabs}
          </div>
          <DashboardHintButton
            hint={dashboardHintPanelControls}
            ariaLabel="Подробнее: период, неделя отчёта и точка"
            className="shrink-0"
          />
        </div>

        <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2 lg:max-w-2xl">
          {period === "rolling_4w" ? (
            <div className="min-w-0">
              <Label htmlFor="dashboard-rolling-anchor" className="mb-2">
                Неделя отчёта
              </Label>
              <select
                id="dashboard-rolling-anchor"
                className={nativeSelectClass}
                value={rollingAnchor}
                onChange={(e) => setRollingAnchor(e.target.value)}
                disabled={weekMondays.length === 0}
              >
                <option value="">Последняя завершённая неделя</option>
                {weekMondays.map((w) => (
                  <option key={w} value={w}>
                    {formatWeekRangeLabel(w)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="min-w-0">
              <Label htmlFor="dashboard-period-select" className="mb-2">
                Период
              </Label>
              <select
                id="dashboard-period-select"
                className={nativeSelectClass}
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
                disabled={legacySelectDisabled}
              >
                {period === "week"
                  ? weekMondays.map((w) => (
                      <option key={w} value={w}>
                        {formatWeekRangeLabel(w)}
                      </option>
                    ))
                  : null}
                {period === "month"
                  ? monthOpts.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))
                  : null}
                {period === "quarter"
                  ? quarterOpts.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))
                  : null}
              </select>
            </div>
          )}

          <div className="min-w-0">
            <Label htmlFor="dashboard-outlet" className="mb-2">
              Точка
            </Label>
            <select
              id="dashboard-outlet"
              className={nativeSelectClass}
              value={outletFilter}
              onChange={(e) =>
                setOutletFilter(e.target.value as (typeof OUTLET_OPTIONS)[number]["value"])
              }
            >
              {OUTLET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {period === "rolling_4w" && summaryQ.data ? (
        <div className="mt-4 flex flex-wrap items-center gap-1">
          <div className="flex min-w-0 flex-col gap-1 text-sm text-muted-foreground">
            {rollingWindowLabel ? (
              <p className="m-0">
                <span className="font-medium text-foreground">Период: </span>
                {rollingWindowLabel}
              </p>
            ) : null}
            {updatedLabel ? (
              <p className="m-0">
                <span className="font-medium text-foreground">Обновлено: </span>
                {updatedLabel}
              </p>
            ) : null}
          </div>
          <DashboardHintButton
            hint={dashboardHintRollingMeta}
            ariaLabel="Подробнее: период и время обновления данных"
          />
        </div>
      ) : null}

      {period !== "rolling_4w" ? (
        <DashboardTrendSection period={period} anchor={anchor} outletCode={outletFilter} />
      ) : null}

      {period === "rolling_4w" ? (
        <OwnerRollingCharts
          period={period}
          anchor={effectiveRollingAnchor}
          outletCode={outletFilter}
        />
      ) : null}

      {banner ? (
        <Alert variant="destructive" className="mt-6" role="alert">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      ) : null}

      {summaryQ.isPending && summaryEnabled ? (
        <div className="mt-10 space-y-4" aria-busy="true">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Spinner className="size-[22px] border-2" />
            <span className="text-sm">Загрузка сводки…</span>
          </div>
          {period === "rolling_4w" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-36 animate-pulse rounded-lg bg-muted" />
              <div className="h-36 animate-pulse rounded-lg bg-muted" />
              <div className="h-48 animate-pulse rounded-lg bg-muted sm:col-span-2" />
            </div>
          ) : null}
        </div>
      ) : summaryQ.data ? (
        period === "rolling_4w" ? (
          <div className="mt-8 space-y-12">
            <OwnerKpiStrip kpis={summaryQ.data.blocks.outlets.kpis} />
            {summaryQ.data.blocks.outlets.by_outlet &&
            summaryQ.data.blocks.outlets.by_outlet.length > 0 ? (
              <OwnerOutletCompare byOutlet={summaryQ.data.blocks.outlets.by_outlet} />
            ) : null}
            <OwnerOzonSection block={summaryQ.data.blocks.ozon} seriesQ={rollingSeries.ozon} />
            <OwnerSiteSection block={summaryQ.data.blocks.site} seriesQ={rollingSeries.site} />
            <OwnerReturnsSection block={summaryQ.data.blocks.returns} seriesQ={rollingSeries.returns} />
            <OwnerReputationMatrix
              outletFilter={outletFilter}
              maps2gisQ={rollingSeries.maps2gis}
              mapsYandexQ={rollingSeries.mapsYandex}
            />
            <OwnerQuickLinks />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <DashboardSectionHeading
              title="Сводка по разделам"
              hint={dashboardHintLegacyCards}
              hintAriaLabel="Подробнее: карточки разделов"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {DASHBOARD_BLOCKS.map((b) => (
                <DashboardBlockCard
                  key={b.blockKey}
                  title={b.title}
                  block={summaryQ.data!.blocks[b.blockKey]}
                  to={b.reportPath}
                />
              ))}
            </div>
          </div>
        )
      ) : !summaryEnabled || (period !== "rolling_4w" && !anchor) ? (
        <p className="mt-10 text-sm text-muted-foreground">Выберите параметры периода.</p>
      ) : null}
    </div>
    </TooltipProvider>
  );
}
