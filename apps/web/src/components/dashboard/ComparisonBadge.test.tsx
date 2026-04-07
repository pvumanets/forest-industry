import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Comparison } from "../../api/dashboardTypes";
import { ComparisonBadge } from "./ComparisonBadge";

function renderC(c: Comparison) {
  return render(<ComparisonBadge c={c} />);
}

describe("ComparisonBadge", () => {
  it("percent", () => {
    renderC({ kind: "percent", value: 12.3456 });
    expect(screen.getByText("+12.3%")).toBeInTheDocument();
  });

  it("none", () => {
    renderC({ kind: "none" });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("new_from_zero с подсказкой", () => {
    renderC({ kind: "new_from_zero" });
    const el = screen.getByTitle("Рост с нуля");
    expect(el).toHaveTextContent("нов.");
  });
});
