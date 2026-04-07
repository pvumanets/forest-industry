import { TrendingDown, TrendingUp } from "lucide-react";
import type { Comparison } from "../../api/dashboardTypes";
import { cn } from "../../lib/utils";

const base =
  "inline-flex shrink-0 items-center gap-0.5 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums";

export function ComparisonBadge({ c }: { c: Comparison }) {
  if (c.kind === "none") {
    return (
      <span className={cn(base, "border-border bg-muted/60 text-muted-foreground")} title="Нет сравнения">
        —
      </span>
    );
  }
  if (c.kind === "new_from_zero") {
    return (
      <span
        className={cn(base, "border-primary/40 bg-primary/15 text-primary")}
        title="Рост с нуля"
      >
        нов.
      </span>
    );
  }
  const v = c.value ?? 0;
  const rounded = Math.round(v * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  const Icon = rounded < 0 ? TrendingDown : rounded > 0 ? TrendingUp : null;
  return (
    <span className={cn(base, "border-border bg-muted/50 text-foreground")}>
      {Icon ? <Icon className="size-3.5 opacity-80" aria-hidden /> : null}
      <span>
        {sign}
        {rounded}%
      </span>
    </span>
  );
}
