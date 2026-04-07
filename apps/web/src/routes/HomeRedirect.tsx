import { Navigate } from "react-router-dom";
import { useMeUser } from "../auth/MeContext";
import { homePathForRole } from "../auth/redirects";

export function HomeRedirect() {
  const user = useMeUser();
  return <Navigate to={homePathForRole(user.role)} replace />;
}
