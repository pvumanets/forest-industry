/** Опции anchor для месяца и квартала (локальный календарь; границы «сегодня» на клиенте). */

export interface AnchorOption {
  value: string;
  label: string;
}

export function monthAnchorOptions(count = 24): AnchorOption[] {
  const out: AnchorOption[] = [];
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const value = `${y}-${String(m).padStart(2, "0")}-01`;
    const label = d.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    out.push({ value, label });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

const Q_MONTH = [1, 4, 7, 10] as const;

export function quarterAnchorOptions(quartersBack = 12): AnchorOption[] {
  const out: AnchorOption[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) as 0 | 1 | 2 | 3;
  for (let i = 0; i < quartersBack; i++) {
    const month = Q_MONTH[q];
    const value = `${y}-${String(month).padStart(2, "0")}-01`;
    out.push({ value, label: `Q${q + 1} ${y}` });
    if (q === 0) {
      q = 3;
      y -= 1;
    } else {
      q = (q - 1) as 0 | 1 | 2 | 3;
    }
  }
  return out;
}

export function formatWeekRangeLabel(anchorMonday: string): string {
  const [yy, mm, dd] = anchorMonday.split("-").map(Number);
  const start = new Date(yy, mm - 1, dd);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  return `Пн ${f(start)} — Вс ${f(end)}`;
}

/** Понедельник первой недели → воскресенье последней: «9 марта — 5 апреля 2026». */
export function formatRollingPeriodHumanRange(firstWeekMonday: string, lastWeekMonday: string): string | null {
  if (!firstWeekMonday?.trim() || !lastWeekMonday?.trim()) return null;
  const [y1, m1, d1] = firstWeekMonday.split("-").map(Number);
  const [y2, m2, d2] = lastWeekMonday.split("-").map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null;
  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  end.setDate(end.getDate() + 6);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const dayMonth = (d: Date) =>
    d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const full = (d: Date) =>
    d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  if (start.getFullYear() === end.getFullYear()) {
    return `${dayMonth(start)} — ${dayMonth(end)} ${end.getFullYear()}`;
  }
  return `${full(start)} — ${full(end)}`;
}

/** «7 апреля, 11:23» для строки обновления сводки. */
export function formatDashboardUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const timePart = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart}, ${timePart}`;
}
