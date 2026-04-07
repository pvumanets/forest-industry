import { Navigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { MeProvider } from "../auth/MeContext";
import { useMe } from "../auth/useMe";
import { GroveTemplateShell } from "../components/layout/GroveTemplateShell";

export function ProtectedLayout() {
  const q = useMe();

  if (q.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  if (q.isError) {
    const err = q.error;
    if (err instanceof ApiError && err.status === 401) {
      return <Navigate to="/login" replace />;
    }
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-muted px-4 text-center">
        <p className="text-foreground">Не удалось загрузить профиль.</p>
        <p className="text-sm text-muted-foreground">
          Проверьте соединение и попробуйте обновить страницу.
        </p>
      </div>
    );
  }

  const user = q.data;
  return (
    <MeProvider user={user}>
      <GroveTemplateShell />
    </MeProvider>
  );
}
