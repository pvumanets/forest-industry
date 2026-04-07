import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  Globe,
  LayoutDashboard,
  Map,
  Recycle,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import type { UserRole } from "../api/types";

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: LucideIcon;
}

function iconForReport(to: string): LucideIcon {
  if (to.includes("site")) return Globe;
  if (to.includes("outlets")) return Store;
  if (to.includes("2gis") || to.includes("yandex")) return Map;
  if (to.includes("ozon")) return ShoppingBag;
  if (to.includes("returns")) return Recycle;
  return BarChart3;
}

export function navForRole(role: UserRole): { primary: NavItem[]; reports: NavItem[] } {
  const reportDefs: { to: string; label: string }[] = [
    { to: "/reports/site", label: "Сайт" },
    { to: "/reports/outlets", label: "Точки" },
    { to: "/reports/maps/2gis", label: "Карты 2ГИС" },
    { to: "/reports/maps/yandex", label: "Карты Яндекс" },
    { to: "/reports/ozon", label: "Ozon" },
    { to: "/reports/returns", label: "Возвраты" },
  ];

  const reports: NavItem[] = reportDefs.map((r) => ({
    ...r,
    icon: iconForReport(r.to),
  }));

  if (role === "site_manager") {
    return {
      primary: [
        {
          to: "/entry/offline",
          label: "Ввод по точке",
          end: false,
          icon: Store,
        },
      ],
      reports: [],
    };
  }

  const primary: NavItem[] = [
    {
      to: "/dashboard",
      label: "Сводка",
      end: true,
      icon: LayoutDashboard,
    },
  ];
  if (role === "marketer") {
    primary.push({
      to: "/entry/week",
      label: "Ввод за неделю",
      end: false,
      icon: CalendarDays,
    });
    primary.push({
      to: "/entry/reputation",
      label: "Репутация",
      end: false,
      icon: Star,
    });
  }
  return { primary, reports };
}
