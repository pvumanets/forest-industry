import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getReportSeries } from "../../api/reportsApi";
import type { ReportApiTopic } from "../../api/reportsTypes";
import {
  OzonSeriesChart,
  ReturnsSeriesCharts,
  SeriesChartBlock,
} from "../../components/reports/SeriesChartBlock";
import { SeriesTableBlock } from "../../components/reports/SeriesTableBlock";
import { DateRangePickerField } from "../../components/forms/DateRangePickerField";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";
import { useNavigateOn401 } from "../../hooks/useNavigateOn401";
import { presetLast8Weeks } from "../../lib/reportDateDefaults";
import { cn } from "../../lib/utils";

const OUTLET_ALL = "__all__";
const OUTLET_TABS: { code: string; label: string }[] = [
  { code: "", label: "Все" },
  { code: "NOVOGRAD", label: "Новоградский" },
  { code: "SVERDLOV", label: "Свердловский" },
];

type Variant = "site" | "outlets" | "maps2gis" | "mapsYandex" | "ozon" | "returns";

const VARIANT_CFG: Record<
  Variant,
  { title: string; crumb: string; topic: ReportApiTopic; outletFilter: boolean }
> = {
  site: {
    title: "Сайт: динамика",
    crumb: "Сайт",
    topic: "site",
    outletFilter: false,
  },
  outlets: {
    title: "Точки: динамика",
    crumb: "Точки",
    topic: "outlets",
    outletFilter: true,
  },
  maps2gis: {
    title: "Карты: 2ГИС",
    crumb: "Карты 2ГИС",
    topic: "maps-2gis",
    outletFilter: true,
  },
  mapsYandex: {
    title: "Карты: Яндекс",
    crumb: "Карты Яндекс",
    topic: "maps-yandex",
    outletFilter: true,
  },
  ozon: {
    title: "Ozon: динамика",
    crumb: "Ozon",
    topic: "ozon",
    outletFilter: false,
  },
  returns: {
    title: "Возвраты",
    crumb: "Возвраты",
    topic: "returns",
    outletFilter: false,
  },
};

export function ReportDrilldownPage({ variant }: { variant: Variant }) {
  const cfg = VARIANT_CFG[variant];
  const initial = useMemo(() => presetLast8Weeks(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [outlet, setOutlet] = useState("");

  const outletToggleValue = outlet || OUTLET_ALL;

  const seriesQ = useQuery({
    queryKey: ["report", "series", cfg.topic, from, to, outlet || null],
    queryFn: () => getReportSeries(cfg.topic, from, to, outlet || undefined),
    staleTime: 30_000,
  });

  useNavigateOn401(seriesQ.error);

  let banner: string | null = null;
  if (seriesQ.error instanceof ApiError) {
    if (seriesQ.error.status === 403) {
      banner = "Недостаточно прав.";
    } else if (seriesQ.error.status === 422) {
      banner = seriesQ.error.message;
    } else {
      banner = "Не удалось загрузить данные. Проверьте соединение.";
    }
  }

  const series = seriesQ.data?.series ?? [];

  return (
    <div>
      <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm">
        <RouterLink to="/dashboard" className="font-semibold text-primary hover:underline">
          Дашборд
        </RouterLink>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{cfg.crumb}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{cfg.title}</h1>

      <div className="mt-4 flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center">
        <DateRangePickerField
          ariaLabel="Период отчёта"
          from={from}
          to={to}
          onRangeChange={({ from: f, to: t }) => {
            setFrom(f);
            setTo(t);
          }}
          className="w-full min-w-0 sm:w-auto sm:max-w-md"
        />
        {cfg.outletFilter ? (
          <ToggleGroup
            type="single"
            value={outletToggleValue}
            onValueChange={(v) => {
              if (v) setOutlet(v === OUTLET_ALL ? "" : v);
            }}
            className="inline-flex h-9 w-full max-w-md flex-nowrap gap-0 rounded-lg bg-muted p-1 sm:w-auto"
            aria-label="Точка"
          >
            {OUTLET_TABS.map((t) => (
              <ToggleGroupItem
                key={t.code || "all"}
                value={t.code || OUTLET_ALL}
                className={cn(
                  "relative z-0 min-h-8 flex-1 rounded-md border-0 px-4 text-sm font-medium shadow-none",
                  "text-muted-foreground transition-[color,box-shadow,background-color]",
                  "hover:bg-transparent hover:text-foreground",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "data-[state=on]:z-[1] data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm",
                )}
              >
                {t.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : null}
      </div>

      {banner ? (
        <Alert variant="destructive" className="mt-4" role="alert">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        {seriesQ.isPending ? (
          <p className="text-sm text-muted-foreground">Загрузка графика…</p>
        ) : variant === "ozon" ? (
          <OzonSeriesChart series={series} />
        ) : variant === "returns" ? (
          <ReturnsSeriesCharts series={series} />
        ) : (
          <SeriesChartBlock series={series} />
        )}
        <SeriesTableBlock series={series} />
      </div>
    </div>
  );
}
