import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaveErrorToast } from "./SaveErrorToast";

describe("SaveErrorToast", () => {
  it("ничего не рендерит при visible=false", () => {
    const { container } = render(
      <SaveErrorToast visible={false} message="Ошибка" />,
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("показывает сообщение с role=alert", () => {
    render(<SaveErrorToast visible message="Не удалось сохранить." />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Не удалось сохранить.")).toBeInTheDocument();
  });
});
