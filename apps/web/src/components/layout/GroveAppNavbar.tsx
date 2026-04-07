import { LayoutDashboard, Menu } from "lucide-react";
import * as React from "react";
import { MenuButton } from "./MenuButton";
import { GroveSideMenuMobile } from "./GroveSideMenuMobile";

export function GroveAppNavbar() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-border bg-card md:hidden">
        <div className="flex w-full items-center gap-2 px-3 py-3">
          <div className="mr-auto flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-gradient-to-br from-emerald-400 to-emerald-800 text-white shadow-inner">
              <LayoutDashboard className="size-4" aria-hidden />
            </div>
            <h1 className="text-lg font-bold text-foreground">Grove Pulse</h1>
          </div>
          <MenuButton aria-label="Меню" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </MenuButton>
        </div>
      </header>
      <GroveSideMenuMobile open={open} onOpenChange={setOpen} />
    </>
  );
}
