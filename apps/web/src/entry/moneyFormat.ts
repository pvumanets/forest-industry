/** Неразрывные пробелы: перенос не должен рвать сумму и не отрывать ₽ от числа. */
const NBSP = "\u00a0";

/** Отображение денег в рублях (ui-copy-guidelines §5): число + символ ₽. */
export function formatRub(value: number): string {
  const raw = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  const n = raw.replace(/[\u202f\u00a0 ]/g, NBSP);
  return `${n}${NBSP}₽`;
}

const dec2 = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type RubKpiDisplay =
  | { mode: "plain"; text: string; full: string }
  | {
      mode: "scale";
      sign: string;
      coefficient: string;
      suffix: "тыс" | "млн" | "млрд";
      full: string;
    };

/**
 * KPI: полная сумма в `full` для title; для экрана — plain или scale с суффиксом
 * (тыс / млн / млрд), коэффициент с 2 знаками после запятой.
 */
export function formatRubKpiDisplay(value: number): RubKpiDisplay {
  const full = formatRub(value);
  const av = Math.abs(value);
  const sign = value < 0 ? "−" : "";

  if (av < 10_000) {
    return { mode: "plain", text: full, full };
  }

  const coef = (x: number) => dec2.format(x).replace(/[\u202f\u00a0 ]/g, NBSP);

  if (av < 1_000_000) {
    return {
      mode: "scale",
      sign,
      coefficient: coef(av / 1_000),
      suffix: "тыс",
      full,
    };
  }

  if (av < 1_000_000_000) {
    return {
      mode: "scale",
      sign,
      coefficient: coef(av / 1_000_000),
      suffix: "млн",
      full,
    };
  }

  return {
    mode: "scale",
    sign,
    coefficient: coef(av / 1_000_000_000),
    suffix: "млрд",
    full,
  };
}

/**
 * Одна строка для таблиц и обратной совместимости.
 */
export function formatRubKpiCompact(value: number): { short: string; full: string } {
  const d = formatRubKpiDisplay(value);
  if (d.mode === "plain") {
    return { short: d.text, full: d.full };
  }
  const short = `${d.sign}${d.coefficient}${NBSP}${d.suffix}${NBSP}₽`;
  return { short, full: d.full };
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
