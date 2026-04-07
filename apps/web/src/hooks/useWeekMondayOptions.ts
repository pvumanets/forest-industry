import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchSelectableWeeks } from "../api/referenceApi";
import { getReportSeries } from "../api/reportsApi";
import { isoTodayLocal } from "../lib/reportDateDefaults";

/** Понедельники для селекта периода «неделя»: selectable + недели из ряда site за ~15 мес. */
export function useWeekMondayOptions(): string[] {
  const weeksQ = useQuery({
    queryKey: ["weeks", "selectable"],
    queryFn: fetchSelectableWeeks,
    staleTime: 120_000,
  });

  const to = isoTodayLocal();
  const fromD = new Date();
  fromD.setHours(0, 0, 0, 0);
  fromD.setDate(fromD.getDate() - 460);
  const from = fromD.toISOString().slice(0, 10);

  const siteQ = useQuery({
    queryKey: ["series", "site", "week-anchors", from, to],
    queryFn: () => getReportSeries("site", from, to),
    staleTime: 300_000,
  });

  return useMemo(() => {
    const set = new Set<string>();
    for (const w of weeksQ.data ?? []) {
      set.add(w.week_start);
    }
    const pts = siteQ.data?.series[0]?.points;
    if (pts) {
      for (const p of pts) {
        set.add(p.x);
      }
    }
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [weeksQ.data, siteQ.data]);
}
