import { Link as RouterLink } from "react-router-dom";
import { DASHBOARD_BLOCKS } from "../../../dashboard/blockMeta";
import { dashboardHintQuickLinks } from "../../../lib/dashboardSectionHints";
import { DashboardSectionHeading } from "../DashboardSectionHeading";

export function OwnerQuickLinks() {
  return (
    <nav className="border-t border-border pt-8" aria-label="Быстрые ссылки на отчёты">
      <DashboardSectionHeading
        title="Все отчёты"
        hint={dashboardHintQuickLinks}
        hintAriaLabel="Подробнее: ссылки на отчёты"
        eyebrow
        className="mb-3"
      />
      <ul className="m-0 flex flex-wrap gap-2 p-0 list-none">
        {DASHBOARD_BLOCKS.map((b) => (
          <li key={b.blockKey}>
            <RouterLink
              to={b.reportPath}
              className="inline-flex rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-ring/50 hover:bg-muted/50"
            >
              {b.title}
            </RouterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
