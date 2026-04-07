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
