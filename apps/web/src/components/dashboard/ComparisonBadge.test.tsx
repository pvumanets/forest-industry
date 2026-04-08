import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Comparison } from "../../api/dashboardTypes";
import type { KpiPolarity } from "../../lib/kpiPolarity";
import { ComparisonBadge } from "./ComparisonBadge";

function renderC(c: Comparison, polarity?: KpiPolarity) {
  return render(<ComparisonBadge c={c} polarity={polarity} />);
}

describe("ComparisonBadge", () => {
  it("percent", () => {
    const { container } = renderC({ kind: "percent", value: 12.3456 });
    expect(screen.getByText("+12.3%")).toBeInTheDocument();
    expect(container.querySelector(".lucide-arrow-up")).toBeTruthy();
  });

  it("percent negative: ArrowDown and magnitude without minus (arrow = direction)", () => {
    const { container } = renderC({ kind: "percent", value: -3.2 });
    expect(screen.getByText("3.2%")).toBeInTheDocument();
    expect(screen.getByLabelText("Изменение к прошлому периоду: -3.2%")).toBeInTheDocument();
    expect(container.querySelector(".lucide-arrow-down")).toBeTruthy();
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

  it("higher_better positive: success styling", () => {
    const { container } = renderC({ kind: "percent", value: 8 }, "higher_better");
    const el = container.firstElementChild;
    expect(el?.className).toMatch(/border-success/);
    expect(el?.className).toMatch(/success-muted/);
  });

  it("higher_better negative: destructive styling", () => {
    const { container } = renderC({ kind: "percent", value: -5 }, "higher_better");
    const el = container.firstElementChild;
    expect(el?.className).toMatch(/destructive/);
  });

  it("lower_better positive: destructive (рост плохой)", () => {
    const { container } = renderC({ kind: "percent", value: 6.4 }, "lower_better");
    const el = container.firstElementChild;
    expect(el?.className).toMatch(/destructive/);
  });

  it("lower_better negative: success", () => {
    const { container } = renderC({ kind: "percent", value: -4 }, "lower_better");
    const el = container.firstElementChild;
    expect(el?.className).toMatch(/border-success/);
  });

  it("below negligible threshold: neutral even if higher_better", () => {
    const { container } = renderC({ kind: "percent", value: 0.3 }, "higher_better");
    const el = container.firstElementChild;
    expect(el?.className).toMatch(/border-border/);
    expect(el?.className).toMatch(/bg-muted/);
    expect(el?.className).not.toMatch(/border-success/);
  });

  it("without polarity: neutral styling", () => {
    const { container } = renderC({ kind: "percent", value: 20 });
    const el = container.firstElementChild;
    expect(el?.className).toMatch(/border-border/);
    expect(el?.className).not.toMatch(/border-success/);
  });

  it("neutral polarity: neutral styling", () => {
    const { container } = renderC({ kind: "percent", value: 12 }, "neutral");
    const el = container.firstElementChild;
    expect(el?.className).toMatch(/border-border/);
  });
});
