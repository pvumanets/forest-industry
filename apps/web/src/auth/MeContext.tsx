import { createContext, useContext } from "react";
import type { MeUser } from "../api/types";

const MeContext = createContext<MeUser | null>(null);

export function MeProvider({
  user,
  children,
}: {
  user: MeUser;
  children: React.ReactNode;
}) {
  return <MeContext.Provider value={user}>{children}</MeContext.Provider>;
}

export function useMeUser(): MeUser {
  const v = useContext(MeContext);
  if (!v) {
    throw new Error("useMeUser вне MeProvider");
  }
  return v;
}
