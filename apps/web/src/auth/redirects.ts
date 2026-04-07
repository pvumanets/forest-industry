import type { UserRole } from "../api/types";

/** Куда вести пользователя с «домашнего» маршрута `/`. */
export function homePathForRole(role: UserRole): string {
  return role === "site_manager" ? "/entry/offline" : "/dashboard";
}
