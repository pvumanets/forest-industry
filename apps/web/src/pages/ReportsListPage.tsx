import { Link } from "react-router-dom";
import { reportDestinationLinks } from "../navigation/navConfig";
import { cn } from "../lib/utils";

export function ReportsListPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Список отчетов</h1>
      <p className="mb-6 text-muted-foreground">Выберите отчёт для просмотра.</p>
      <ul className="flex max-w-md flex-col gap-1">
        {reportDestinationLinks.map((r) => (
          <li key={r.to}>
            <Link
              to={r.to}
              className={cn(
                "block rounded-lg border border-border bg-card px-4 py-3 text-sm font-light text-foreground",
                "transition-colors hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {r.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
