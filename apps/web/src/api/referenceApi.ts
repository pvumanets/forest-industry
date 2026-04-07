import { apiJson } from "./client";

export interface WeekSelectableItem {
  week_start: string;
  label: string;
}

export function fetchSelectableWeeks(): Promise<WeekSelectableItem[]> {
  return apiJson<WeekSelectableItem[]>("/api/weeks/selectable");
}
