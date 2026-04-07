import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import { getDashboardSummary } from "../api/dashboardApi";
import type { DashboardPeriod } from "../api/dashboardTypes";
import { DashboardBlockCard } from "../components/dashboard/DashboardBlockCard";
import { DashboardTrendSection } from "../components/dashboard/DashboardTrendSection";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import { cn } from "../lib/utils";
import { DASHBOARD_BLOCKS } from "../dashboard/blockMeta";
import { useNavigateOn401 } from "../hooks/useNavigateOn401";
import { useWeekMondayOptions } from "../hooks/useWeekMondayOptions";
import { nativeSelectClass } from "../lib/formNativeClasses";
import {
  formatWeekRangeLabel,
  monthAnchorOptions,
  quarterAnchorOptions,
} from "../lib/periodAnchors";

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [anchor, setAnchor] = useState("");
  const weekMondays = useWeekMondayOptions();
  const monthOpts = useMemo(() => monthAnchorOptions(24), []);
  const quarterOpts = useMemo(() => quarterAnchorOptions(12), []);

  useEffect(() => {
    setAnchor("");
  }, [period]);

  useEffect(() => {
    if (anchor) return;
    if (period === "week" && weekMondays[0]) {
      setAnchor(weekMondays[0]);
    } else if (period === "month" && monthOpts[0]) {
      setAnchor(monthOpts[0].value);
    } else if (period === "quarter" && quarterOpts[0]) {
      setAnchor(quarterOpts[0].value);
    }
  }, [period, anchor, weekMondays, monthOpts, quarterOpts]);

  const summaryQ = useQuery({
    queryKey: ["dashboard", "summary", period, anchor],
    queryFn: () => getDashboardSummary(period, anchor),
    enabled: Boolean(anchor),
    staleTime: 60_000,
  });

  useNavigateOn401(summaryQ.error);

  let banner: string | null = null;
  if (summaryQ.error instanceof ApiError) {
    if (summaryQ.error.status === 403) {
      banner = "Недостаточно прав для просмотра дашборда.";
    } else if (summaryQ.error.status === 422) {
      banner =
        typeof summaryQ.error.message === "string"
          ? summaryQ.error.message
          : "Некорректные параметры периода.";
    } else {
      banner = "Не удалось загрузить сводку. Проверьте соединение.";
    }
  }

  const periodTabs = (
    [
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
          "relative z-0 inline-flex min-h-9 flex-1 items-center justify-center rounded-md px-4 text-sm font-medium transition-[color,box-shadow,background-color]",
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

  const selectDisabled =
    (period === "week" && weekMondays.length === 0) ||
    (period === "month" && monthOpts.length === 0) ||
    (period === "quarter" && quarterOpts.length === 0);

  return (
    <div className="w-full">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Сводка</h1>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div
          className="inline-flex w-full max-w-md rounded-lg bg-muted p-1"
          role="tablist"
          aria-label="Тип периода"
        >
          {periodTabs}
        </div>

        <div className="w-full min-w-0 max-w-md lg:max-w-sm">
          <Label htmlFor="dashboard-period-select" className="mb-2">
            Период
          </Label>
          <select
            id="dashboard-period-select"
            className={nativeSelectClass}
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            disabled={selectDisabled}
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
      </div>

      <DashboardTrendSection period={period} anchor={anchor} />

      {banner ? (
        <Alert variant="destructive" className="mt-6" role="alert">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      ) : null}

      {summaryQ.isPending && anchor ? (
        <div className="mt-10 flex items-center gap-3 text-muted-foreground">
          <Spinner className="size-[22px] border-2" />
          <span className="text-sm">Загрузка…</span>
        </div>
      ) : summaryQ.data ? (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_BLOCKS.map((b) => (
            <DashboardBlockCard
              key={b.blockKey}
              title={b.title}
              block={summaryQ.data.blocks[b.blockKey]}
              to={b.reportPath}
            />
          ))}
        </div>
      ) : !anchor ? (
        <p className="mt-10 text-sm text-muted-foreground">Выберите параметры периода.</p>
      ) : null}
    </div>
  );
}
