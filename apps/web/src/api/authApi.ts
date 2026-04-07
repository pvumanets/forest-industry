import { apiFetch, apiJson } from "./client";
import type { MeUser } from "./types";

export interface LoginResponseBody {
  user: {
    id: number;
    login: string;
    display_name: string;
    role: string;
  };
}

export async function fetchMe(): Promise<MeUser> {
  return apiJson<MeUser>("/api/auth/me");
}

export async function login(loginName: string, password: string): Promise<LoginResponseBody> {
  return apiJson<LoginResponseBody>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ login: loginName, password }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
