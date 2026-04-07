import { Bell } from "lucide-react";
import { GroveNavbarBreadcrumbs } from "./GroveNavbarBreadcrumbs";
import { MenuButton } from "./MenuButton";

export function GroveChromeHeader() {
  return (
    <header className="hidden w-full max-w-[1700px] flex-row items-center justify-between gap-4 pt-3 md:flex">
      <GroveNavbarBreadcrumbs />
      <div className="flex items-center gap-1">
        <MenuButton showBadge aria-label="Уведомления">
          <Bell className="size-5" />
        </MenuButton>
      </div>
    </header>
  );
}
