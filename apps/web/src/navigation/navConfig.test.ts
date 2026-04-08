import { describe, expect, it } from "vitest";
import { isNavGroup, navForRole } from "./navConfig";

describe("navForRole", () => {
  it("site_manager: один пункт без групп", () => {
    const nav = navForRole("site_manager");
    expect(nav).toHaveLength(1);
    expect(isNavGroup(nav[0]!)).toBe(false);
    if (!isNavGroup(nav[0]!)) {
      expect(nav[0].to).toBe("/entry/offline");
    }
  });

  it("owner: сводка, отчеты, о компании — без ввода данных", () => {
    const nav = navForRole("owner");
    expect(nav).toHaveLength(3);
    expect(isNavGroup(nav[0]!)).toBe(false);
    const groups = nav.filter(isNavGroup);
    expect(groups.map((g) => g.label)).toEqual(["Отчеты", "О компании"]);
    const dataGroup = groups.find((g) => g.label === "Внести данные");
    expect(dataGroup).toBeUndefined();
    const reports = groups.find((g) => g.label === "Отчеты");
    expect(reports?.children.map((c) => c.to)).toEqual(["/reports"]);
  });

  it("marketer: четыре блока включая ввод данных", () => {
    const nav = navForRole("marketer");
    expect(nav).toHaveLength(4);
    const data = nav.find(isNavGroup);
    expect(data?.label).toBe("Внести данные");
    expect(data?.children.map((c) => c.to)).toEqual([
      "/entry/week",
      "/entry/point-metrics",
      "/entry/reputation",
      "/entry/defect",
    ]);
  });
});
