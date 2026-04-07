import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { MeUser } from "../api/types";
import { MeProvider } from "../auth/MeContext";
import { RoleGuard } from "./RoleGuard";

const baseUser = {
  id: 1,
  login: "u",
  display_name: "User",
  outlets: [] as MeUser["outlets"],
};

function renderGuard(
  user: MeUser,
  initialPath: string,
  routes: ReactNode,
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <MeProvider user={user}>{routes}</MeProvider>
    </MemoryRouter>,
  );
}

describe("RoleGuard", () => {
  it("перенаправляет site_manager с /dashboard на /entry/offline", async () => {
    const user: MeUser = { ...baseUser, role: "site_manager" };
    renderGuard(
      user,
      "/dashboard",
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RoleGuard allow={["owner", "marketer"]}>
              <div>inside-dashboard</div>
            </RoleGuard>
          }
        />
        <Route path="/entry/offline" element={<div>offline-page</div>} />
      </Routes>,
    );
    expect(await screen.findByText("offline-page")).toBeInTheDocument();
    expect(screen.queryByText("inside-dashboard")).not.toBeInTheDocument();
  });

  it("перенаправляет owner с /entry/offline на /dashboard", async () => {
    const user: MeUser = { ...baseUser, role: "owner" };
    renderGuard(
      user,
      "/entry/offline",
      <Routes>
        <Route path="/dashboard" element={<div>dashboard-page</div>} />
        <Route
          path="/entry/offline"
          element={
            <RoleGuard allow={["site_manager"]}>
              <div>inside-offline</div>
            </RoleGuard>
          }
        />
      </Routes>,
    );
    expect(await screen.findByText("dashboard-page")).toBeInTheDocument();
    expect(screen.queryByText("inside-offline")).not.toBeInTheDocument();
  });

  it("перенаправляет site_manager с /dashboard на /entry/offline", async () => {
    const user: MeUser = { ...baseUser, role: "site_manager" };
    renderGuard(
      user,
      "/dashboard",
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RoleGuard allow={["owner", "marketer"]}>
              <div>dash</div>
            </RoleGuard>
          }
        />
        <Route path="/entry/offline" element={<div>offline-target</div>} />
      </Routes>,
    );
    expect(await screen.findByText("offline-target")).toBeInTheDocument();
  });

  it("пускает marketer на /entry/week", () => {
    const user: MeUser = { ...baseUser, role: "marketer" };
    renderGuard(
      user,
      "/entry/week",
      <Routes>
        <Route
          path="/entry/week"
          element={
            <RoleGuard allow={["marketer"]}>
              <div>week-form</div>
            </RoleGuard>
          }
        />
      </Routes>,
    );
    expect(screen.getByText("week-form")).toBeInTheDocument();
  });
});
