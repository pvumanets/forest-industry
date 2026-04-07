import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "../ui/tooltip";
import { DashboardSectionHeading } from "./DashboardSectionHeading";

function renderWithTooltip(ui: ReactElement) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>);
}

describe("DashboardSectionHeading", () => {
  it("renders title and hint trigger with aria-label", () => {
    renderWithTooltip(
      <DashboardSectionHeading title="Тестовый блок" hint="Первый абзац.\n\nВторой абзац." hintAriaLabel="Пояснение к блоку" />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Тестовый блок" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Пояснение к блоку" })).toBeInTheDocument();
  });

  it("shows hint content when trigger is hovered", async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <DashboardSectionHeading title="Заголовок" hint="Уникальный текст подсказки для теста." />,
    );
    await user.hover(screen.getByRole("button", { name: "Что означает этот блок" }));
    const nodes = await screen.findAllByText("Уникальный текст подсказки для теста.");
    expect(nodes.length).toBeGreaterThanOrEqual(1);
  });
});
