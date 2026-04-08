/** Опции anchor для месяца и квартала (локальный календарь; границы «сегодня» на клиенте). */

export interface AnchorOption {
  value: string;
  label: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Календарный диапазон: «9 марта — 5 апреля 2026» или полные даты при смене года. */
export function formatHumanCalendarRange(start: Date, end: Date): string | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const dayMonth = (d: Date) =>
    d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  if (start.getFullYear() === end.getFullYear()) {
    return `${dayMonth(start)} — ${dayMonth(end)} ${end.getFullYear()}`;
  }
  // ru-RU с year: "numeric" даёт хвост « г.» — убираем для единообразия с остальными подписями
  return `${dayMonth(start)} ${start.getFullYear()} — ${dayMonth(end)} ${end.getFullYear()}`;
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
    const raw = d.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    const label = raw.replace(/\s*г\.?$/u, "").trim();
    out.push({ value, label });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

const Q_MONTH = [1, 4, 7, 10] as const;
const QUARTER_ROMAN = ["I", "II", "III", "IV"] as const;

export function quarterAnchorOptions(quartersBack = 12): AnchorOption[] {
  const out: AnchorOption[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) as 0 | 1 | 2 | 3;
  for (let i = 0; i < quartersBack; i++) {
    const month = Q_MONTH[q];
    const value = `${y}-${String(month).padStart(2, "0")}-01`;
    out.push({ value, label: `${QUARTER_ROMAN[q]} квартал ${y}` });
    if (q === 0) {
      q = 3;
      y -= 1;
    } else {
      q = (q - 1) as 0 | 1 | 2 | 3;
    }
  }
  return out;
}

/** Одна отчётная неделя (якорь — понедельник): «30 марта — 5 апреля 2026». */
export function formatWeekRangeLabel(anchorMonday: string): string {
  const [yy, mm, dd] = anchorMonday.split("-").map(Number);
  const start = new Date(yy, mm - 1, dd);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return formatHumanCalendarRange(start, end) ?? anchorMonday;
}

/**
 * Подпись опции «4 недели»: якорь — понедельник последней недели окна;
 * интервал совпадает с `rolling_current_four_mondays` на бэкенде.
 */
export function formatRollingFourWeeksSelectLabel(anchorEndMonday: string): string | null {
  const trimmed = anchorEndMonday?.trim();
  if (!trimmed) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  if (!y || !m || !d) return null;
  const endMonday = new Date(y, m - 1, d);
  if (Number.isNaN(endMonday.getTime())) return null;
  const firstMonday = new Date(endMonday);
  firstMonday.setDate(firstMonday.getDate() - 21);
  const firstIso = toIsoLocalDate(firstMonday);
  return formatRollingPeriodHumanRange(firstIso, trimmed);
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
  return formatHumanCalendarRange(start, end);
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
