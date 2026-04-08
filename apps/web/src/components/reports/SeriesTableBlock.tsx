import type { SeriesRow } from "../../api/reportsTypes";
import { mergeSeriesForChart } from "../../lib/mergeSeriesForChart";
import { formatSeriesAxisOrTooltipValue } from "../../lib/reportSeriesMoney";

function cellFmt(v: unknown, columnKey: string): string {
  if (v === null || v === undefined) return "—";
  if (typeof v !== "number") return String(v);
  return formatSeriesAxisOrTooltipValue(columnKey, v);
}

export function SeriesTableBlock({ series }: { series: SeriesRow[] }) {
  const rows = mergeSeriesForChart(series);
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-muted text-left text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Дата / неделя</th>
            {series.map((s) => (
              <th key={s.key} className="px-3 py-2">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.x)} className="border-t border-border">
              <td className="px-3 py-2 tabular-nums text-foreground">{String(r.x)}</td>
              {series.map((s) => (
                <td key={s.key} className="px-3 py-2 tabular-nums text-foreground">
                  {cellFmt(r[s.key], s.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
