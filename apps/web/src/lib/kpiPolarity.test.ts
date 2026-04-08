import { describe, expect, it } from "vitest";
import { ALL_REGISTRY_KPI_IDS, getKpiPolarity, NEGLIGIBLE_PERCENT } from "./kpiPolarity";

describe("getKpiPolarity", () => {
  it("higher_better revenue family", () => {
    expect(getKpiPolarity("DER-REV-TOT")).toBe("higher_better");
    expect(getKpiPolarity("OZ-REV")).toBe("higher_better");
    expect(getKpiPolarity("OFF-REV")).toBe("higher_better");
  });

  it("lower_better returns and spend", () => {
    expect(getKpiPolarity("DER-RET-SUM-TOT")).toBe("lower_better");
    expect(getKpiPolarity("WEB-BEH-BOUNCE")).toBe("lower_better");
    expect(getKpiPolarity("DER-AD-TOTAL")).toBe("lower_better");
  });

  it("neutral registry ids", () => {
    expect(getKpiPolarity("DER-OZ-SHARE")).toBe("neutral");
    expect(getKpiPolarity("WEB-BEH-TIME")).toBe("neutral");
  });

  it("unknown id is neutral", () => {
    expect(getKpiPolarity("UNKNOWN-KPI-999")).toBe("neutral");
  });

  it("registry list has no duplicate ids", () => {
    const set = new Set(ALL_REGISTRY_KPI_IDS);
    expect(set.size).toBe(ALL_REGISTRY_KPI_IDS.length);
  });
});

describe("NEGLIGIBLE_PERCENT", () => {
  it("is documented threshold for noise", () => {
    expect(NEGLIGIBLE_PERCENT).toBe(0.5);
  });
});
