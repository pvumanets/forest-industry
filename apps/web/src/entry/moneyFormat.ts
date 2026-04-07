/** Отображение денег в рублях (ui-copy-guidelines §5). */
export function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseMoneyInput(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

export function parseIntInput(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (s === "") return null;
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return null;
  return n;
}
