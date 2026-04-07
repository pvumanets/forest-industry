export type DashboardPeriod = "week" | "month" | "quarter";

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
  previous_anchor: string;
  blocks: {
    site: DashboardBlock;
    outlets: DashboardBlock;
    maps_2gis: DashboardBlock;
    maps_yandex: DashboardBlock;
    ozon: DashboardBlock;
    returns: DashboardBlock;
  };
}
