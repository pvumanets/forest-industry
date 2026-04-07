/** Форматирование KPI для дашборда (ui-copy §5, табличные цифры на стороне className). */

const money = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

const dec1 = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dec4 = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function formatKpiValue(id: string, v: number | null): string {
  if (v === null) return "—";

  if (
    id === "WEB-TRF-TOT" ||
    id === "DER-ORD-TOT" ||
    id === "OFF-ORD" ||
    id === "OZ-ORD" ||
    id === "OZ-RET-N" ||
    id === "REP-REV-CNT-TOT" ||
    id === "OFF-RET-N-TOT" ||
    id === "REP-REV-DELTA"
  ) {
    return intFmt.format(v);
  }

  if (id === "WEB-BEH-BOUNCE") {
    return `${dec1.format(v)}%`;
  }

  if (id === "WEB-BEH-TIME") {
    return dec1.format(v);
  }

  if (id === "REP-RATING-AVG") {
    return dec4.format(v);
  }

  return money.format(v);
}
