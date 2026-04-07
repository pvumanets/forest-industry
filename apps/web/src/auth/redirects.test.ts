import { describe, expect, it } from "vitest";
import { homePathForRole } from "./redirects";

describe("homePathForRole", () => {
  it("site_manager → /entry/offline", () => {
    expect(homePathForRole("site_manager")).toBe("/entry/offline");
  });

  it("owner и marketer → /dashboard", () => {
    expect(homePathForRole("owner")).toBe("/dashboard");
    expect(homePathForRole("marketer")).toBe("/dashboard");
  });
});
