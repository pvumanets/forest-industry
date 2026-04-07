import { Bell, CreditCard, LogOut, MoreVertical, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../api/authApi";
import { useMeUser } from "../../auth/MeContext";
import { meQueryKey } from "../../auth/queryKeys";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MenuButton } from "./MenuButton";

export function GroveOptionsMenu() {
  const user = useMeUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function onLogout() {
    try {
      await logout();
    } finally {
      queryClient.removeQueries({ queryKey: meQueryKey });
      navigate("/login", { replace: true });
    }
  }

  const initial = user.display_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <MenuButton aria-label="Меню профиля" className="text-sidebar-accent-foreground">
          <MoreVertical className="size-5" />
        </MenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" sideOffset={8} className="w-64 p-0">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-medium text-sidebar-primary-foreground">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.login}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-1">
          <DropdownMenuItem asChild className="gap-2 px-2 py-2">
            <Link to="/dashboard">
              <User className="size-4 opacity-70" />
              Аккаунт
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="gap-2 px-2 py-2">
            <CreditCard className="size-4 opacity-70" />
            Оплата
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="gap-2 px-2 py-2">
            <Bell className="size-4 opacity-70" />
            Уведомления
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-1">
          <DropdownMenuItem
            onClick={() => void onLogout()}
            className="gap-2 px-2 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="size-4" />
            Выйти
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
