import { Bell, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "../../api/types";
import { logout } from "../../api/authApi";
import { useMeUser } from "../../auth/MeContext";
import { meQueryKey } from "../../auth/queryKeys";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { GroveMenuContent } from "./GroveMenuContent";
import { GroveSidebarHint } from "./GroveSidebarHint";
import { MenuButton } from "./MenuButton";

function roleLabel(role: UserRole): string {
  if (role === "owner") return "Владелец";
  if (role === "marketer") return "Маркетолог";
  return "Менеджер точки";
}

interface GroveSideMenuMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroveSideMenuMobile({ open, onOpenChange }: GroveSideMenuMobileProps) {
  const user = useMeUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function onLogout() {
    onOpenChange(false);
    try {
      await logout();
    } finally {
      queryClient.removeQueries({ queryKey: meQueryKey });
      navigate("/login", { replace: true });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(85vw,20rem)] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Меню</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col font-light">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {user.display_name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <p className="min-w-0 flex-1 truncate text-base font-semibold">{user.display_name}</p>
            <MenuButton showBadge aria-label="Уведомления">
              <Bell className="size-5" />
            </MenuButton>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <GroveMenuContent role={user.role} />
          </div>
          <GroveSidebarHint />
          <div className="border-t border-border p-4">
            <Button variant="outline" className="w-full gap-2" onClick={() => void onLogout()}>
              <LogOut className="size-4" />
              Выйти
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
