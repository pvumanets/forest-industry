import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "inFlexRow" | "block";

/**
 * Обёртка значения KPI: без горизонтального скролла, перенос длинного текста (проценты и т.д.).
 */
export function KpiValueOverflow({
  className,
  children,
  variant = "inFlexRow",
  title,
}: {
  className?: string;
  children: ReactNode;
  variant?: Variant;
  title?: string;
}) {
  const wrap = variant === "inFlexRow" ? "min-w-0 w-full flex-1" : "min-w-0 w-full max-w-full";
  return (
    <div className={wrap} title={title}>
      <p
        className={cn(
          "m-0 min-w-0 max-w-full break-words font-bold tabular-nums leading-tight text-foreground",
          className,
        )}
      >
        {children}
      </p>
    </div>
  );
}
