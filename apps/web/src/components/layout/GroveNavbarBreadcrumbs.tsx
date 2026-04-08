import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/** Более специфичные префиксы выше, чем `/reports`, иначе вложенные отчёты попадут под «Список отчетов». */
const PATH_LABELS: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Сводка" },
  { prefix: "/entry/week", label: "Общие показатели" },
  { prefix: "/entry/reputation", label: "Репутация" },
  { prefix: "/entry/offline", label: "Ввод по точке" },
  { prefix: "/entry/point-metrics", label: "Показатели с точек" },
  { prefix: "/entry/defect", label: "Я заметил брак" },
  { prefix: "/company/rules", label: "Правила и философия" },
  { prefix: "/company/documents", label: "Документы" },
  { prefix: "/reports/site", label: "Отчёт: сайт" },
  { prefix: "/reports/outlets", label: "Отчёт: точки" },
  { prefix: "/reports/maps/2gis", label: "Отчёт: 2ГИС" },
  { prefix: "/reports/maps/yandex", label: "Отчёт: Яндекс" },
  { prefix: "/reports/ozon", label: "Отчёт: Ozon" },
  { prefix: "/reports/returns", label: "Отчёт: возвраты" },
  { prefix: "/reports", label: "Список отчетов" },
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
