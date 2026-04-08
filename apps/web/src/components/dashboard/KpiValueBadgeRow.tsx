import type { ReactNode } from "react";

/**
 * Значение + primary ComparisonBadge: в узком контейнере (@container на Card) — колонка,
 * от ~240px ширины карточки — строка. Родитель должен иметь class `@container`.
 */
export function KpiValueBadgeRow({ value, badge }: { value: ReactNode; badge: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 @min-[240px]:flex-row @min-[240px]:items-start @min-[240px]:justify-between">
      <div className="min-w-0 w-full">{value}</div>
      <div className="flex shrink-0 justify-start">{badge}</div>
    </div>
  );
}
