import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { UserRole } from "../../api/types";
import { cn } from "../../lib/utils";
import { isNavGroup, navForRole, type NavGroup } from "../../navigation/navConfig";

const navLinkClass = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors";

function pathMatchesChild(pathname: string, childTo: string): boolean {
  return pathname === childTo || pathname.startsWith(`${childTo}/`);
}

function groupHasActiveChild(pathname: string, group: NavGroup): boolean {
  return group.children.some((c) => pathMatchesChild(pathname, c.to));
}

function NavMenuGroup({ group }: { group: NavGroup }) {
  const { pathname } = useLocation();
  const childActive = useMemo(() => groupHasActiveChild(pathname, group), [pathname, group]);
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const groupId = `nav-group-${group.label.replace(/\s+/g, "-")}`;
  const Icon = group.icon;

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        id={`${groupId}-trigger`}
        aria-expanded={open}
        aria-controls={`${groupId}-panel`}
        className={cn(
          navLinkClass,
          "w-full text-left font-light text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          childActive && "font-normal text-sidebar-foreground",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
        <span className="min-w-0 flex-1">{group.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          id={`${groupId}-panel`}
          role="list"
          aria-label={group.label}
          className="ml-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-2"
        >
          {group.children.map((child) => (
            <li key={child.to}>
              <NavLink
                to={child.to}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg py-1.5 pl-3 pr-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary font-normal text-sidebar-primary-foreground shadow-sm"
                      : "font-light text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )
                }
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function GroveMenuContent({ role }: { role: UserRole }) {
  const entries = navForRole(role);

  return (
    <div className="flex flex-1 flex-col gap-1 p-2">
      <nav className="flex flex-col gap-0.5" aria-label="Основное меню">
        {entries.map((entry, index) => {
          if (isNavGroup(entry)) {
            return <NavMenuGroup key={`group-${index}-${entry.label}`} group={entry} />;
          }
          const Icon = entry.icon;
          return (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.end}
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
              {entry.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
