export type ReportApiTopic =
  | "site"
  | "outlets"
  | "company"
  | "marketing"
  | "maps-2gis"
  | "maps-yandex"
  | "ozon"
  | "returns";

export interface SeriesPoint {
  x: string;
  y: number;
}

export interface SeriesRow {
  key: string;
  label: string;
  points: SeriesPoint[];
}

export interface ReportSeriesResponse {
  topic: string;
  from: string;
  to: string;
  series: SeriesRow[];
}
