import { Navigate } from "react-router-dom";
import type { UserRole } from "../api/types";
import { useMeUser } from "../auth/MeContext";
import { homePathForRole } from "../auth/redirects";

export function RoleGuard({
  allow,
  children,
}: {
  allow: readonly UserRole[];
  children: React.ReactNode;
}) {
  const user = useMeUser();
  if (!allow.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }
  return <>{children}</>;
}
