import type { LucideIcon } from "lucide-react";
import { Building2, FileBarChart, LayoutDashboard, PenLine, Store } from "lucide-react";
import type { UserRole } from "../api/types";

export interface NavLeaf {
  to: string;
  label: string;
  end?: boolean;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: { to: string; label: string }[];
}

export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

/** Ссылки на конкретные отчёты (страница «Список отчетов»). */
export const reportDestinationLinks: { to: string; label: string }[] = [
  { to: "/reports/site", label: "Сайт" },
  { to: "/reports/outlets", label: "Точки" },
  { to: "/reports/maps/2gis", label: "Карты 2ГИС" },
  { to: "/reports/maps/yandex", label: "Карты Яндекс" },
  { to: "/reports/ozon", label: "Ozon" },
  { to: "/reports/returns", label: "Возвраты" },
];

export function navForRole(role: UserRole): NavEntry[] {
  if (role === "site_manager") {
    return [
      {
        to: "/entry/offline",
        label: "Ввод по точке",
        end: false,
        icon: Store,
      },
    ];
  }

  const summary: NavLeaf = {
    to: "/dashboard",
    label: "Сводка",
    end: true,
    icon: LayoutDashboard,
  };

  const reportsGroup: NavGroup = {
    label: "Отчеты",
    icon: FileBarChart,
    children: [{ to: "/reports", label: "Список отчетов" }],
  };

  const companyGroup: NavGroup = {
    label: "О компании",
    icon: Building2,
    children: [
      { to: "/company/rules", label: "Правила и философия" },
      { to: "/company/documents", label: "Документы" },
    ],
  };

  if (role === "marketer") {
    const dataGroup: NavGroup = {
      label: "Внести данные",
      icon: PenLine,
      children: [
        { to: "/entry/week", label: "Общие показатели" },
        { to: "/entry/point-metrics", label: "Показатели с точек" },
        { to: "/entry/reputation", label: "Репутация" },
        { to: "/entry/defect", label: "Я заметил брак" },
      ],
    };
    return [summary, dataGroup, reportsGroup, companyGroup];
  }

  return [summary, reportsGroup, companyGroup];
}
