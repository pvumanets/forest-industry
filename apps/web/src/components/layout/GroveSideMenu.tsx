import { useMeUser } from "../../auth/MeContext";
import { GroveMenuContent } from "./GroveMenuContent";
import { GroveOptionsMenu } from "./GroveOptionsMenu";
import { GroveSelectBranding } from "./GroveSelectBranding";
import { GroveSidebarHint } from "./GroveSidebarHint";

export function GroveSideMenu() {
  const user = useMeUser();

  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar font-light md:flex"
      aria-label="Боковое меню"
    >
      <div className="p-3 pt-4">
        <GroveSelectBranding />
      </div>
      <div className="border-t border-sidebar-border" />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <GroveMenuContent role={user.role} />
        <GroveSidebarHint />
      </div>
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-medium text-sidebar-primary-foreground">
            {user.display_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-normal leading-tight text-sidebar-accent-foreground">
              {user.display_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.login}</p>
          </div>
          <GroveOptionsMenu />
        </div>
      </div>
    </aside>
  );
}
