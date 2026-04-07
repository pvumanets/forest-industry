export type DashboardPeriod = "week" | "month" | "quarter" | "rolling_4w";

export type ComparisonKind = "percent" | "none" | "new_from_zero";

export interface Comparison {
  kind: ComparisonKind;
  value?: number;
}

export interface DashboardKpi {
  id: string;
  label: string;
  current: number | null;
  previous: number | null;
  comparison: Comparison;
  /** WoW / вторичное сравнение (rolling_4w и др.) */
  secondary_previous?: number | null;
  secondary_comparison?: Comparison;
}

export interface DashboardOutletSlice {
  outlet_code: string;
  display_name: string;
  kpis: DashboardKpi[];
}

export interface DashboardBlock {
  kpis: DashboardKpi[];
  by_outlet?: DashboardOutletSlice[];
}

export interface DashboardSummary {
  period: DashboardPeriod;
  anchor: string;
  /** Конец предыдущего окна/периода; для rolling без prior — null */
  previous_anchor: string | null;
  /** Понедельники текущего окна rolling (только rolling_4w) */
  week_starts?: string[];
  /** Max updated_at по данным окна (ISO) */
  updated_at_max?: string | null;
  /** ALL | NOVOGRAD | SVERDLOV */
  outlet_code?: string;
  blocks: {
    site: DashboardBlock;
    outlets: DashboardBlock;
    maps_2gis: DashboardBlock;
    maps_yandex: DashboardBlock;
    ozon: DashboardBlock;
    returns: DashboardBlock;
  };
}
