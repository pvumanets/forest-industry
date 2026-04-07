import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

/** Упрощённый сценарий: смена week_start в селекте запрашивает другой URL. */
function Probe({
  fetchFn,
}: {
  fetchFn: (url: string) => Promise<{ week_start: string }>;
}) {
  const [week, setWeek] = useState("");
  const q = useQuery({
    queryKey: ["submission", "marketing", week],
    queryFn: () => fetchFn(`/api/submissions/marketing/${week}`),
    enabled: Boolean(week),
  });
  return (
    <div>
      <select
        aria-label="week"
        value={week}
        onChange={(e) => setWeek(e.target.value)}
      >
        <option value="">—</option>
        <option value="2026-02-23">Неделя 1</option>
        <option value="2026-02-16">Неделя 2</option>
      </select>
      {q.data ? <span data-testid="ws">{q.data.week_start}</span> : null}
    </div>
  );
}

describe("WeekSubmissionQuery", () => {
  it("при смене недели вызывается fetch с новым week_start в пути", async () => {
    const user = userEvent.setup();
    const fetchFn = vi
      .fn()
      .mockImplementation(async (url: string) => {
        const m = url.match(/\/marketing\/(.+)$/);
        return { week_start: m?.[1] ?? "" };
      });

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={qc}>
        <Probe fetchFn={fetchFn} />
      </QueryClientProvider>,
    );

    await user.selectOptions(screen.getByLabelText("week"), "2026-02-23");
    await waitFor(() => {
      expect(screen.getByTestId("ws")).toHaveTextContent("2026-02-23");
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/submissions/marketing/2026-02-23",
    );

    await user.selectOptions(screen.getByLabelText("week"), "2026-02-16");
    await waitFor(() => {
      expect(screen.getByTestId("ws")).toHaveTextContent("2026-02-16");
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/submissions/marketing/2026-02-16",
    );
  });
});
