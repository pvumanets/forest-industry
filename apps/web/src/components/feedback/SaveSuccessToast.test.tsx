import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SaveSuccessToast } from "./SaveSuccessToast";

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("SaveSuccessToast", () => {
  it("ничего не рендерит при visible=false", () => {
    const { container } = renderWithRouter(
      <SaveSuccessToast visible={false} action={{ label: "Дашборд", to: "/dashboard" }} />,
    );
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("показывает заголовок и hint", () => {
    renderWithRouter(
      <SaveSuccessToast visible title="Готово" hint="Подсказка под текстом" />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Готово")).toBeInTheDocument();
    expect(screen.getByText("Подсказка под текстом")).toBeInTheDocument();
  });

  it("по умолчанию показывает «Данные сохранены»", () => {
    renderWithRouter(<SaveSuccessToast visible />);
    expect(screen.getByText("Данные сохранены")).toBeInTheDocument();
  });

  it("рендерит ссылку-действие с правильным href", () => {
    renderWithRouter(
      <SaveSuccessToast
        visible
        action={{ label: "Открыть дашборд", to: "/dashboard" }}
      />,
    );
    const link = screen.getByRole("link", { name: "Открыть дашборд" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
