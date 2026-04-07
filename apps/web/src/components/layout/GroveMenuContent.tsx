import { NavLink } from "react-router-dom";
import type { UserRole } from "../../api/types";
import { navForRole } from "../../navigation/navConfig";
import { cn } from "../../lib/utils";

const navLinkClass = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors";

export function GroveMenuContent({ role }: { role: UserRole }) {
  const { primary, reports } = navForRole(role);

  return (
    <div className="flex flex-1 flex-col gap-1 p-2">
      <nav className="flex flex-col gap-0.5" aria-label="Основное меню">
        {primary.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  navLinkClass,
                  isActive
                    ? "bg-sidebar-primary font-normal text-sidebar-primary-foreground shadow-sm"
                    : "font-light text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      {reports.length > 0 ? (
        <nav className="mt-4 flex flex-col gap-0.5" aria-label="Отчёты">
          <div className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Отчёты
          </div>
          {reports.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    navLinkClass,
                    isActive
                      ? "bg-sidebar-primary font-normal text-sidebar-primary-foreground shadow-sm"
                      : "font-light text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )
                }
              >
                <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
