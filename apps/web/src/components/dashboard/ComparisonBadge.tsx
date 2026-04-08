import { ArrowDown, ArrowUp } from "lucide-react";
import type { Comparison } from "../../api/dashboardTypes";
import { NEGLIGIBLE_PERCENT, type KpiPolarity } from "../../lib/kpiPolarity";
import { cn } from "../../lib/utils";

const base =
  "inline-flex shrink-0 items-center gap-0.5 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums";

const neutralPercent = "border-border bg-muted/50 text-foreground";
const goodPercent =
  "border-success/40 bg-success-muted text-foreground [&_svg]:text-success [&_svg]:opacity-90";
const badPercent = "border-destructive/40 bg-destructive/10 text-destructive [&_svg]:opacity-90";

function percentTone(polarity: KpiPolarity | undefined, rounded: number): "neutral" | "good" | "bad" {
  const p = polarity ?? "neutral";
  if (p === "neutral" || rounded === 0 || Math.abs(rounded) < NEGLIGIBLE_PERCENT) {
    return "neutral";
  }
  const good =
    (p === "higher_better" && rounded > 0) || (p === "lower_better" && rounded < 0);
  return good ? "good" : "bad";
}

export function ComparisonBadge({
  c,
  polarity,
}: {
  c: Comparison;
  polarity?: KpiPolarity;
}) {
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
  const Icon = rounded < 0 ? ArrowDown : rounded > 0 ? ArrowUp : null;
  const tone = percentTone(polarity, rounded);
  const toneClass = tone === "good" ? goodPercent : tone === "bad" ? badPercent : neutralPercent;
  /** Стрелка уже задаёт направление; без «−» у зелёного «хорошего» снижения расходов нет когнитивного конфликта. */
  const label =
    rounded > 0 ? `+${rounded}%` : rounded < 0 ? `${Math.abs(rounded)}%` : `${rounded}%`;
  const exactDelta =
    rounded > 0 ? `+${rounded}%` : rounded < 0 ? `${rounded}%` : `${rounded}%`;

  return (
    <span
      className={cn(base, toneClass)}
      title={rounded !== 0 ? `К прошлому периоду: ${exactDelta}` : undefined}
    >
      {Icon ? <Icon className="size-3.5 shrink-0 opacity-90" aria-hidden /> : null}
      <span aria-label={`Изменение к прошлому периоду: ${exactDelta}`}>{label}</span>
    </span>
  );
}
