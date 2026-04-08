import type { RubKpiDisplay } from "../../entry/moneyFormat";
import { cn } from "../../lib/utils";

const NBSP = "\u00a0";

/** Крупно коэффициент и ₽, суффикс тыс/млн/млрд — ~2/3 кегля (как в макете). */
export function KpiMoneyValue({
  display,
  className,
  title,
}: {
  display: RubKpiDisplay;
  className?: string;
  /** Подсказка с полной суммой при scale; для plain обычно не нужен. */
  title?: string;
}) {
  if (display.mode === "plain") {
    return (
      <span
        className={cn(
          "inline-flex max-w-full flex-wrap items-baseline font-bold tabular-nums leading-tight text-foreground",
          className,
        )}
        title={title}
      >
        {display.text}
      </span>
    );
  }

  const tip = title ?? display.full;
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-baseline gap-x-0.5 text-foreground",
        className,
      )}
      title={tip}
    >
      <span className="font-bold tabular-nums leading-tight">
        {display.sign}
        {display.coefficient}
      </span>
      <span className="self-baseline font-semibold tabular-nums leading-none text-[0.67em]">
        {display.suffix}
      </span>
      <span className="font-bold tabular-nums leading-tight">
        {NBSP}₽
      </span>
    </span>
  );
}
