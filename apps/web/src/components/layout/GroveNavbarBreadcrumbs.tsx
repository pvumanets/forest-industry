import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

const PATH_LABELS: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Дашборд" },
  { prefix: "/entry/week", label: "Ввод за неделю" },
  { prefix: "/entry/offline", label: "Ввод по точке" },
  { prefix: "/reports/site", label: "Отчёт: сайт" },
  { prefix: "/reports/outlets", label: "Отчёт: точки" },
  { prefix: "/reports/maps/2gis", label: "Отчёт: 2ГИС" },
  { prefix: "/reports/maps/yandex", label: "Отчёт: Яндекс" },
  { prefix: "/reports/ozon", label: "Отчёт: Ozon" },
  { prefix: "/reports/returns", label: "Отчёт: возвраты" },
];

function labelForPath(pathname: string): string {
  const hit = PATH_LABELS.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  return hit?.label ?? "Раздел";
}

export function GroveNavbarBreadcrumbs() {
  const { pathname } = useLocation();
  const pageLabel = useMemo(() => labelForPath(pathname), [pathname]);

  return (
    <nav aria-label="Навигация" className="my-2 flex flex-wrap items-center gap-1 text-sm">
      <span className="text-foreground">Grove Pulse</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-semibold text-foreground">{pageLabel}</span>
    </nav>
  );
}
